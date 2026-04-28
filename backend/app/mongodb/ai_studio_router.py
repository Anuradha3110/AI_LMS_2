"""
AI Learning Studio — MongoDB router.
Handles AI module generation, draft persistence, lesson regeneration,
tone rewriting, translation, and publish-to-SQL orchestration.
"""
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.mongodb.connection import webx_db
from app.core.config import settings

router = APIRouter(prefix="/api/mongo/ai-studio", tags=["AI Studio"])

# ── Low-level LLM call with higher token budget ───────────────────

def _call_ai(system: str, user: str, max_tokens: int = 5000) -> str:
    """Direct LLM call with configurable token limit."""
    from urllib import request as urlreq
    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    try:
        body = json.dumps(payload).encode()
        req = urlreq.Request(
            f"{settings.AI_BASE_URL}/chat/completions",
            data=body, method="POST",
            headers={
                "Authorization": f"Bearer {settings.AI_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        with urlreq.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
        return data["choices"][0]["message"]["content"]
    except Exception:
        return ""


def _extract_json(raw: str) -> Optional[Dict[str, Any]]:
    """Extract the first valid JSON object from LLM output."""
    if not raw:
        return None
    raw = raw.strip()
    # Strip markdown fences
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
    raw = raw.strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    m = re.search(r'\{[\s\S]*\}', raw)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            pass
    return None


def _fallback_course(topic: str, audience: str, num_lessons: int,
                     duration: int, language: str) -> Dict[str, Any]:
    """Deterministic fallback module when AI is unavailable."""
    num_mods = max(1, (num_lessons + 2) // 3)
    modules = []
    idx = 0
    for mi in range(num_mods):
        count = min(3, num_lessons - idx)
        lessons = []
        for li in range(count):
            lessons.append({
                "title": f"Lesson {idx + 1}: Foundations of {topic}",
                "content_text": (
                    f"## Overview\n\nThis lesson introduces the core principles of **{topic}**.\n\n"
                    "## Key Concepts\n\n"
                    "- Understand the fundamental ideas\n"
                    "- Apply them to real-world scenarios\n"
                    "- Recognise common challenges and solutions\n\n"
                    "## Practical Application\n\n"
                    f"Work through the activities to reinforce your understanding of {topic}. "
                    "Focus on the examples provided and connect them to your daily work.\n\n"
                    "## Summary\n\n"
                    "Complete the quiz at the end of this module to verify your understanding."
                ),
                "summary": f"An introduction to the fundamentals of {topic} with practical examples.",
                "activities": [
                    "Reflect on how this concept applies to your role",
                    "Discuss a real scenario with a colleague",
                    "Review the provided resources",
                ],
                "content_type": "text",
            })
            idx += 1
        modules.append({
            "title": f"Module {mi + 1}: {topic} — Part {mi + 1}",
            "description": f"Section {mi + 1} of the {topic} training programme.",
            "section_title": f"Section {mi + 1}",
            "lessons": lessons,
            "quiz": {
                "title": f"Module {mi + 1} Knowledge Check",
                "passing_score": 70,
                "questions": [
                    {
                        "question": f"What is the primary goal of learning {topic}?",
                        "options": {
                            "a": "To memorise facts",
                            "b": "To apply knowledge in real situations",
                            "c": "To pass the quiz",
                            "d": "None of the above",
                        },
                        "correct_index": 1,
                        "explanation": f"The goal of {topic} training is practical application in the workplace.",
                    },
                    {
                        "question": f"Which approach best supports mastery of {topic}?",
                        "options": {
                            "a": "Reading only",
                            "b": "Watching videos only",
                            "c": "Combining theory with hands-on practice",
                            "d": "Skipping the activities",
                        },
                        "correct_index": 2,
                        "explanation": "A blended approach combining theory and practice yields the best results.",
                    },
                ],
            },
            "assignment": {
                "title": f"Module {mi + 1} Practical Assignment",
                "description": f"Apply the concepts from Module {mi + 1} to a real scenario.",
                "guidelines": (
                    "1. Review all lessons in this module\n"
                    "2. Identify one situation in your work where this applies\n"
                    "3. Document your approach and expected outcome\n"
                    "4. Submit a 200-word reflection"
                ),
            },
        })
    return {
        "title": f"{topic} Training Programme",
        "description": (
            f"A comprehensive {audience.lower()}-level programme designed to build "
            f"proficiency in {topic} over {duration} weeks."
        ),
        "objectives": (
            f"• Understand the core principles of {topic}\n"
            "• Apply knowledge to real workplace scenarios\n"
            "• Demonstrate measurable improvement in performance"
        ),
        "category": "Operations",
        "level": audience.lower() if audience.lower() in ["beginner", "intermediate", "advanced"] else "intermediate",
        "estimated_hours": round(duration * 1.5, 1),
        "tags": [topic, audience, language],
        "modules": modules,
    }


# ── Request / Response Models ──────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str
    audience_level: str = "Intermediate"
    duration_weeks: int = 4
    num_lessons: int = 6
    language: str = "English"
    tone: str = "Professional"
    learning_goal: str = ""
    additional_prompt: str = ""


class RegenerateLessonRequest(BaseModel):
    lesson_title: str
    topic: str
    tone: str = "Professional"
    language: str = "English"
    additional_instructions: str = ""


class RewriteRequest(BaseModel):
    content: str
    new_tone: str
    language: str = "English"


class TranslateRequest(BaseModel):
    content: str
    target_language: str


class SaveDraftRequest(BaseModel):
    title: str
    generated_data: Dict[str, Any]
    inputs: Dict[str, Any]
    draft_id: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────

@router.post("/generate")
async def generate_module(body: GenerateRequest):
    """Generate a complete learning module using AI."""
    num_mods = max(1, (body.num_lessons + 2) // 3)
    goal = body.learning_goal or f"Master {body.topic} and apply it effectively"
    extra = body.additional_prompt or "Make the content practical and engaging."

    system = (
        "You are a senior instructional designer at a top-tier corporate training company. "
        "Generate complete, professional learning modules. "
        "CRITICAL: Return ONLY a valid JSON object. No markdown fences. No prose. "
        "Start your response with { and end with }."
    )

    user = f"""Create a complete learning module for the following specification:

Topic: {body.topic}
Audience Level: {body.audience_level}
Duration: {body.duration_weeks} weeks
Total Lessons: {body.num_lessons} (spread across {num_mods} modules)
Language: {body.language}
Tone/Style: {body.tone}
Learning Goal: {goal}
Additional Instructions: {extra}

Return this exact JSON (populate ALL fields with real, substantive content in {body.language}):
{{
  "title": "Engaging professional title",
  "description": "2-3 sentence overview of the programme",
  "objectives": "• Objective 1\\n• Objective 2\\n• Objective 3\\n• Objective 4",
  "category": "Sales|Support|Operations|HR|Technical|Compliance",
  "level": "beginner|intermediate|advanced",
  "estimated_hours": {round(body.duration_weeks * 1.5, 1)},
  "tags": ["tag1", "tag2", "tag3"],
  "modules": [
    {{
      "title": "Module 1: [Descriptive Title]",
      "description": "What this module covers",
      "section_title": "Section 1",
      "lessons": [
        {{
          "title": "Lesson title",
          "content_text": "## Heading\\n\\nFull lesson body in markdown. 3-4 paragraphs. Include examples, key points, and practical tips.",
          "summary": "2-sentence summary of this lesson.",
          "activities": ["Specific activity 1", "Specific activity 2"],
          "content_type": "text"
        }}
      ],
      "quiz": {{
        "title": "Module 1 Assessment",
        "passing_score": 70,
        "questions": [
          {{
            "question": "Clear question text",
            "options": {{"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"}},
            "correct_index": 0,
            "explanation": "Why this option is correct"
          }}
        ]
      }},
      "assignment": {{
        "title": "Module 1 Assignment",
        "description": "What the learner must produce",
        "guidelines": "Step 1: ...\\nStep 2: ...\\nStep 3: ..."
      }}
    }}
  ]
}}

Requirements:
- Exactly {body.num_lessons} lessons total across {num_mods} modules
- 3-5 quiz questions per module
- All content in {body.language} using {body.tone} tone
- Lesson content_text must be 200-400 words in markdown"""

    raw = _call_ai(system, user, max_tokens=6000)
    data = _extract_json(raw)

    if data and "title" in data and "modules" in data and len(data["modules"]) > 0:
        return {"success": True, "data": data, "ai_generated": True}

    # Fallback
    fallback = _fallback_course(
        body.topic, body.audience_level, body.num_lessons,
        body.duration_weeks, body.language,
    )
    return {"success": True, "data": fallback, "ai_generated": False}


@router.post("/regenerate-lesson")
async def regenerate_lesson(body: RegenerateLessonRequest):
    """Regenerate a single lesson with fresh AI content."""
    extra = body.additional_instructions or "Make it engaging and practical."
    system = (
        f"You are an expert corporate trainer. Write professional lesson content in {body.language} "
        f"using a {body.tone} tone. Return ONLY a valid JSON object."
    )
    user = f"""Regenerate the following lesson with fresh, detailed content:

Lesson Title: {body.lesson_title}
Topic Context: {body.topic}
Language: {body.language}
Tone: {body.tone}
Instructions: {extra}

Return JSON:
{{
  "title": "{body.lesson_title}",
  "content_text": "## Introduction\\n\\nFull markdown lesson body, 3-4 paragraphs.",
  "summary": "2-sentence summary.",
  "activities": ["Activity 1", "Activity 2", "Activity 3"],
  "content_type": "text"
}}"""

    raw = _call_ai(system, user, max_tokens=2000)
    data = _extract_json(raw)
    if data and "content_text" in data:
        return {"success": True, "lesson": data}

    return {
        "success": True,
        "lesson": {
            "title": body.lesson_title,
            "content_text": (
                f"## {body.lesson_title}\n\n"
                f"This lesson explores key aspects of **{body.topic}**.\n\n"
                "## Core Concepts\n\n"
                "- Foundational principle one\n"
                "- Foundational principle two\n"
                "- Practical application\n\n"
                "## Summary\n\n"
                "Review these concepts and complete the associated activities."
            ),
            "summary": f"An updated exploration of {body.lesson_title} within {body.topic}.",
            "activities": ["Reflection exercise", "Case study review", "Peer discussion"],
            "content_type": "text",
        },
    }


@router.post("/rewrite")
async def rewrite_content(body: RewriteRequest):
    """Rewrite content in a different tone."""
    system = (
        f"You are a professional writer. Rewrite the content in {body.new_tone} tone "
        f"in {body.language}. Preserve all facts, headings, and markdown structure. "
        "Return only the rewritten text."
    )
    user = f"Rewrite in {body.new_tone} tone:\n\n{body.content}"
    try:
        from app.services.ai_service import call_llm
        result = call_llm(system, user, cache_type="rewrite")
        return {"success": True, "content": result or body.content}
    except Exception:
        return {"success": True, "content": body.content}


@router.post("/translate")
async def translate_content(body: TranslateRequest):
    """Translate content to target language."""
    system = (
        f"You are a professional translator. Translate to {body.target_language}. "
        "Preserve all markdown formatting exactly. Return only the translated text."
    )
    user = f"Translate to {body.target_language}:\n\n{body.content}"
    try:
        from app.services.ai_service import call_llm
        result = call_llm(system, user, cache_type="translate")
        return {"success": True, "content": result or body.content}
    except Exception:
        return {"success": True, "content": body.content}


@router.post("/save-draft")
async def save_draft(body: SaveDraftRequest):
    """Persist an AI Studio module as a draft in MongoDB."""
    coll = webx_db()["ai_studio_drafts"]
    now = datetime.utcnow()

    if body.draft_id:
        try:
            oid = ObjectId(body.draft_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid draft_id")
        await coll.update_one(
            {"_id": oid},
            {"$set": {
                "title": body.title,
                "generated_data": body.generated_data,
                "inputs": body.inputs,
                "updated_at": now,
            }},
            upsert=True,
        )
        return {"success": True, "draft_id": body.draft_id, "message": "Draft updated"}

    doc = {
        "title": body.title,
        "generated_data": body.generated_data,
        "inputs": body.inputs,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }
    result = await coll.insert_one(doc)
    return {"success": True, "draft_id": str(result.inserted_id), "message": "Draft saved"}


@router.get("/drafts")
async def list_drafts():
    """List all AI Studio drafts (summary only)."""
    coll = webx_db()["ai_studio_drafts"]
    docs = await coll.find(
        {}, {"generated_data": 0}
    ).sort("updated_at", -1).limit(20).to_list(20)
    result = []
    for d in docs:
        result.append({
            "draft_id": str(d["_id"]),
            "title": d.get("title", "Untitled"),
            "status": d.get("status", "draft"),
            "inputs": d.get("inputs", {}),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None,
        })
    return {"drafts": result}


@router.get("/drafts/{draft_id}")
async def get_draft(draft_id: str):
    """Retrieve a specific AI Studio draft by ID."""
    coll = webx_db()["ai_studio_drafts"]
    try:
        oid = ObjectId(draft_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid draft_id")
    doc = await coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Draft not found")
    doc["draft_id"] = str(doc.pop("_id"))
    if doc.get("created_at"):
        doc["created_at"] = doc["created_at"].isoformat()
    if doc.get("updated_at"):
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    """Delete an AI Studio draft."""
    coll = webx_db()["ai_studio_drafts"]
    try:
        oid = ObjectId(draft_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid draft_id")
    result = await coll.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"success": True, "message": "Draft deleted"}
