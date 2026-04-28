"""Integrations: webhooks, webhook delivery logs, external integrations router."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_roles
from app.models import IntegrationWebhook, WebhookDeliveryLog, ExternalIntegration, User
from app.schemas import (
    WebhookCreateRequest, WebhookOut, WebhookDeliveryLogOut,
    ExternalIntegrationCreateRequest, ExternalIntegrationOut,
)

router = APIRouter(prefix="/api", tags=["Integrations"])


@router.post("/integrations/webhooks", response_model=WebhookOut, status_code=201)
def create_webhook(
    body: WebhookCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    hook = IntegrationWebhook(
        tenant_id=current_user.tenant_id,
        name=body.name, provider=body.provider,
        target_url=body.target_url, event_name=body.event_name,
        events=body.events, secret=body.secret,
        headers_json=body.headers_json, retry_policy=body.retry_policy,
    )
    db.add(hook)
    db.commit()
    return _webhook_out(hook)


@router.get("/integrations/webhooks", response_model=List[WebhookOut])
def list_webhooks(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    hooks = db.scalars(
        select(IntegrationWebhook).where(IntegrationWebhook.tenant_id == current_user.tenant_id)
    ).all()
    return [_webhook_out(h) for h in hooks]


@router.delete("/integrations/webhooks/{hook_id}", status_code=204)
def delete_webhook(
    hook_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    hook = db.scalars(
        select(IntegrationWebhook).where(
            IntegrationWebhook.id == hook_id,
            IntegrationWebhook.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    hook.is_active = False
    db.commit()


@router.get("/integrations/webhooks/{hook_id}/logs", response_model=List[WebhookDeliveryLogOut])
def webhook_delivery_logs(
    hook_id: str,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(WebhookDeliveryLog).where(WebhookDeliveryLog.webhook_id == hook_id)
        .order_by(WebhookDeliveryLog.delivered_at.desc()).limit(50)
    ).all()
    return [WebhookDeliveryLogOut(
        id=l.id, webhook_id=l.webhook_id, event_type=l.event_type,
        response_status=l.response_status, attempt_number=l.attempt_number,
        error=l.error, delivered_at=l.delivered_at,
    ) for l in logs]


@router.post("/integrations/external", response_model=ExternalIntegrationOut, status_code=201)
def create_external_integration(
    body: ExternalIntegrationCreateRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    integration = ExternalIntegration(
        tenant_id=current_user.tenant_id,
        integration_type=body.integration_type,
        name=body.name,
        config_json=body.config_json,
    )
    db.add(integration)
    db.commit()
    return ExternalIntegrationOut(
        id=integration.id, integration_type=integration.integration_type,
        name=integration.name, status=integration.status,
        last_synced_at=integration.last_synced_at, created_at=integration.created_at,
    )


@router.get("/integrations/external", response_model=List[ExternalIntegrationOut])
def list_external_integrations(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    integrations = db.scalars(
        select(ExternalIntegration).where(ExternalIntegration.tenant_id == current_user.tenant_id)
    ).all()
    return [ExternalIntegrationOut(
        id=i.id, integration_type=i.integration_type, name=i.name,
        status=i.status, last_synced_at=i.last_synced_at, created_at=i.created_at,
    ) for i in integrations]


def _webhook_out(h: IntegrationWebhook) -> WebhookOut:
    return WebhookOut(
        id=h.id, name=h.name or "", provider=h.provider, target_url=h.target_url,
        event_name=h.event_name, events=h.events or [],
        is_active=h.is_active, last_triggered_at=h.last_triggered_at,
        created_at=h.created_at,
    )
