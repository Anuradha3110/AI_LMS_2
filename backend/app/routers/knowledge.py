"""Knowledge ingestion, website sources, blueprints router."""
import csv
import hashlib
import json
from collections import Counter
from typing import Any, Dict, List
from urllib import request as urlrequest

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import (
    KnowledgeItem, WebsiteSource, IngestionJob,
    CompanyBlueprint, AsyncJob, User,
)
from app.schemas import (
    KnowledgeItemOut, KnowledgeStatsOut,
    WebsiteSourceCreateRequest, WebsiteSourceOut,
    IngestionJobOut,
    BlueprintCreateRequest, BlueprintOut,
    GenerateLmsRequest, JobEnqueueOut,
    TenantDataSyncRequest, TenantDataSyncOut,
)
from app.tasks.jobs import generate_lms_job
from app.services.ai_service import call_llm

router = APIRouter(prefix="/api", tags=["Knowledge"])


# ─── Website Sources ─────────────────────────────────────────────────────────

@router.post("/website-sources", response_model=WebsiteSourceOut, status_code=201)
def create_source(
    body: WebsiteSourceCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    src = WebsiteSource(
        tenant_id=current_user.tenant_id,
        name=body.name, source_type=body.source_type,
        source_uri=body.source_uri, auth_config=body.auth_config,
        sync_schedule=body.sync_schedule,
    )
    db.add(src)
    db.commit()
    return _source_out(src)


@router.get("/website-sources", response_model=List[WebsiteSourceOut])
def list_sources(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    sources = db.scalars(
        select(WebsiteSource).where(WebsiteSource.tenant_id == current_user.tenant_id)
    ).all()
    return [_source_out(s) for s in sources]


@router.post("/website-sources/{source_id}/trigger-sync", response_model=IngestionJobOut, status_code=201)
def trigger_sync(
    source_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    source = db.scalars(
        select(WebsiteSource).where(WebsiteSource.id == source_id, WebsiteSource.tenant_id == current_user.tenant_id)
    ).first()
    if not source:
        raise HTTPException(404, "Source not found")

    job = IngestionJob(
        tenant_id=current_user.tenant_id,
        source_id=source.id,
        status="queued",
    )
    db.add(job)
    db.commit()
    return _ingestion_job_out(job)


@router.get("/website-sources/{source_id}/jobs", response_model=List[IngestionJobOut])
def list_ingestion_jobs(
    source_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(
        select(IngestionJob).where(IngestionJob.source_id == source_id)
        .order_by(IngestionJob.created_at.desc())
    ).all()
    return [_ingestion_job_out(j) for j in jobs]


# ─── Google Sheets Sync (legacy) ─────────────────────────────────────────────

DEFAULT_NAMADARSHAN_TABS = [
    {"name": "Temples", "gid": "99463276", "url": "https://docs.google.com/spreadsheets/d/1lnfU0PJhK749X3HKLgECls6-7z7AzLCFf7xsOrwVaC8/edit"},
    {"name": "Darshan", "gid": "426249344", "url": "https://docs.google.com/spreadsheets/d/1lnfU0PJhK749X3HKLgECls6-7z7AzLCFf7xsOrwVaC8/edit"},
    {"name": "Puja", "gid": "599025530", "url": "https://docs.google.com/spreadsheets/d/1lnfU0PJhK749X3HKLgECls6-7z7AzLCFf7xsOrwVaC8/edit"},
    {"name": "Yatra", "gid": "1038947046", "url": "https://docs.google.com/spreadsheets/d/1lnfU0PJhK749X3HKLgECls6-7z7AzLCFf7xsOrwVaC8/edit"},
]


@router.post("/tenant-data/sync", response_model=TenantDataSyncOut)
def sync_tenant_data(
    body: TenantDataSyncRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    tabs = body.tabs or [type("T", (), t)() for t in DEFAULT_NAMADARSHAN_TABS]
    if not body.tabs:
        tabs = [type("T", (), t)() for t in DEFAULT_NAMADARSHAN_TABS]

    upserted = 0
    for tab in body.tabs or []:
        try:
            rows = _fetch_google_sheet_csv(tab.url, tab.gid)
        except Exception:
            continue
        for i, row in enumerate(rows):
            normalized = _normalize_row(tab.name, row, i + 1, tab.url, tab.gid)
            existing = db.scalars(
                select(KnowledgeItem).where(
                    KnowledgeItem.tenant_id == current_user.tenant_id,
                    KnowledgeItem.canonical_key == normalized["canonical_key"],
                )
            ).first()
            checksum = hashlib.md5(json.dumps(normalized, sort_keys=True).encode()).hexdigest()
            if existing:
                existing.title = normalized["title"]
                existing.description = normalized["description"]
                existing.category = normalized["category"]
                existing.service_type = normalized["service_type"]
                existing.tags_json = {"tags": normalized["tags"]}
                existing.checksum = checksum
            else:
                item = KnowledgeItem(
                    tenant_id=current_user.tenant_id,
                    source_kind="google_sheet",
                    source_tab=normalized["source_tab"],
                    source_gid=normalized["source_gid"],
                    source_row=normalized["source_row"],
                    source_url=normalized["source_url"],
                    canonical_key=normalized["canonical_key"],
                    title=normalized["title"],
                    description=normalized["description"],
                    category=normalized["category"],
                    service_type=normalized["service_type"],
                    team_hint=normalized["team_hint"],
                    tags_json={"tags": normalized["tags"]},
                    checksum=checksum,
                )
                db.add(item)
                upserted += 1
    db.commit()
    return TenantDataSyncOut(ok=True, synced_tabs=len(body.tabs or []), upserted_items=upserted)


# ─── Knowledge Items ─────────────────────────────────────────────────────────

@router.get("/knowledge-items", response_model=List[KnowledgeItemOut])
def list_knowledge_items(
    tab: str = None,
    team: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(KnowledgeItem).where(KnowledgeItem.tenant_id == current_user.tenant_id)
    if tab:
        q = q.where(KnowledgeItem.source_tab == tab)
    if team:
        q = q.where(KnowledgeItem.team_hint == team)
    items = db.scalars(q.order_by(KnowledgeItem.updated_at.desc()).limit(limit).offset(offset)).all()
    return [_ki_out(i) for i in items]


@router.get("/knowledge/stats", response_model=KnowledgeStatsOut)
def knowledge_stats(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(KnowledgeItem).where(KnowledgeItem.tenant_id == current_user.tenant_id)
    ).all()
    total = len(items)
    by_tab = dict(Counter(i.source_tab for i in items))
    by_team = dict(Counter(i.team_hint for i in items))
    by_ctype = dict(Counter(i.content_type for i in items))
    return KnowledgeStatsOut(total_items=total, by_tab=by_tab, by_team_hint=by_team, by_content_type=by_ctype)


# ─── Blueprints ──────────────────────────────────────────────────────────────

@router.post("/onboarding/blueprint", response_model=BlueprintOut, status_code=201)
def create_blueprint(
    body: BlueprintCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    system_prompt = (
        "You are an expert instructional designer. "
        "Given company info, generate a JSON LMS blueprint with keys: "
        "title, description, teams (list of {team, focus_topics}), "
        "course_outline (list of {title, modules: [{title, lessons: [title]}]})"
    )
    user_prompt = f"Company info:\n{body.documents_text[:3000]}\nQuestionnaire: {body.questionnaire}"
    try:
        raw = call_llm(system_prompt, user_prompt)
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        bp_data = json.loads(m.group()) if m else {"raw": raw}
    except Exception:
        bp_data = {"title": body.title, "source_text": body.documents_text[:500]}

    bp = CompanyBlueprint(
        tenant_id=current_user.tenant_id,
        title=body.title,
        blueprint_json=bp_data,
        source_refs_json={"url": body.website_url or ""},
        source="document",
        status="ready",
        prompt_used=user_prompt[:500],
    )
    db.add(bp)
    db.commit()
    return _blueprint_out(bp)


@router.post("/onboarding/blueprint/from-knowledge", response_model=BlueprintOut, status_code=201)
def create_blueprint_from_knowledge(
    body: BlueprintCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(KnowledgeItem).where(KnowledgeItem.tenant_id == current_user.tenant_id).limit(30)
    ).all()
    knowledge_summary = "\n".join([f"- {i.title}: {i.description[:100]}" for i in items])
    system_prompt = (
        "You are an expert instructional designer. "
        "Based on the knowledge base below, create a JSON LMS blueprint with: "
        "title, description, teams, course_outline"
    )
    user_prompt = f"Knowledge base:\n{knowledge_summary}\n\nQuestionnaire:\n{body.questionnaire}"
    try:
        raw = call_llm(system_prompt, user_prompt)
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        bp_data = json.loads(m.group()) if m else {"raw": raw, "items_count": len(items)}
    except Exception:
        bp_data = {"title": body.title, "items_count": len(items)}

    bp = CompanyBlueprint(
        tenant_id=current_user.tenant_id,
        title=body.title or "Blueprint from Knowledge Base",
        blueprint_json=bp_data,
        source="knowledge",
        status="ready",
    )
    db.add(bp)
    db.commit()
    return _blueprint_out(bp)


@router.get("/onboarding/blueprints", response_model=List[BlueprintOut])
def list_blueprints(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    bps = db.scalars(
        select(CompanyBlueprint).where(CompanyBlueprint.tenant_id == current_user.tenant_id)
        .order_by(CompanyBlueprint.created_at.desc())
    ).all()
    return [_blueprint_out(b) for b in bps]


@router.post("/onboarding/generate-lms", response_model=JobEnqueueOut, status_code=202)
def generate_lms(
    body: GenerateLmsRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    job = AsyncJob(
        tenant_id=current_user.tenant_id,
        created_by_user_id=current_user.id,
        job_type="generate_lms",
        status="queued",
        payload_json={"blueprint_id": str(body.blueprint_id)},
    )
    db.add(job)
    db.commit()
    generate_lms_job.delay(str(job.id), str(current_user.tenant_id), str(body.blueprint_id))
    return JobEnqueueOut(job_id=job.id, status="queued", message="LMS generation started")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fetch_google_sheet_csv(spreadsheet_url: str, gid: str) -> List[Dict[str, str]]:
    base = spreadsheet_url.split("/edit")[0]
    csv_url = f"{base}/export?format=csv&gid={gid}"
    req = urlrequest.Request(csv_url, method="GET")
    with urlrequest.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
    rows = []
    reader = csv.DictReader(raw.splitlines())
    for row in reader:
        normalized = {(k or "").strip(): (v or "").strip() for k, v in row.items() if (k or "").strip()}
        if any(normalized.values()):
            rows.append(normalized)
    return rows


def _normalize_row(tab_name: str, row: Dict, source_row: int, source_url: str, gid: str) -> Dict:
    title = (row.get("Title") or row.get("Name") or row.get("Temple Name") or
             row.get("Package Name") or row.get("Service Type") or f"{tab_name} Row {source_row}")
    category = row.get("Category") or row.get("Type") or tab_name
    service_type = row.get("Service Type") or row.get("Topic") or tab_name
    description = row.get("Description") or row.get("About") or row.get("Services Offered") or ""
    team_hint = "operations" if tab_name.lower() in ("temples", "darshan", "puja", "yatra") else "sales"
    canonical_seed = row.get("Slug") or row.get("Page URL") or row.get("ID") or title
    canonical_key = f"{tab_name.lower().replace(' ', '_')}::{str(canonical_seed).lower().strip()}"
    tags = [tab_name, category, service_type]
    return {
        "source_tab": tab_name, "source_gid": gid, "source_row": source_row,
        "source_url": source_url, "canonical_key": canonical_key[:255],
        "title": str(title)[:500], "category": str(category)[:255],
        "service_type": str(service_type)[:255], "team_hint": team_hint,
        "description": str(description)[:2000], "tags": [t for t in tags if t],
    }


def _source_out(s: WebsiteSource) -> WebsiteSourceOut:
    return WebsiteSourceOut(
        id=s.id, name=s.name, source_type=s.source_type,
        source_uri=s.source_uri, sync_status=s.sync_status,
        last_synced_at=s.last_synced_at, sync_error=s.sync_error,
        is_active=s.is_active, created_at=s.created_at,
    )


def _ingestion_job_out(j: IngestionJob) -> IngestionJobOut:
    return IngestionJobOut(
        id=j.id, source_id=j.source_id, status=j.status,
        items_created=j.items_created, items_updated=j.items_updated,
        items_failed=j.items_failed, error_details=j.error_details or {},
        started_at=j.started_at, completed_at=j.completed_at, created_at=j.created_at,
    )


def _ki_out(i: KnowledgeItem) -> KnowledgeItemOut:
    return KnowledgeItemOut(
        id=i.id, source_tab=i.source_tab, source_row=i.source_row,
        title=i.title, category=i.category, service_type=i.service_type,
        team_hint=i.team_hint, description=i.description, content=i.content or "",
        content_type=i.content_type, tags_json=i.tags_json or {},
        attrs_json=i.attrs_json or {}, source_url=i.source_url,
        checksum=i.checksum, is_indexed=i.is_indexed, updated_at=i.updated_at,
    )


def _blueprint_out(b: CompanyBlueprint) -> BlueprintOut:
    return BlueprintOut(
        id=b.id, title=b.title or "", version=b.version,
        blueprint_json=b.blueprint_json, source=b.source,
        status=b.status, created_at=b.created_at,
    )
