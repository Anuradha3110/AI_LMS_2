"""
AI Service Layer — LLM calls with caching and usage logging.
Supports Groq / OpenAI-compatible providers.
"""
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from app.core.config import settings


def _make_cache_key(system_prompt: str, user_prompt: str) -> str:
    raw = f"{system_prompt}|||{user_prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()


def call_llm(system_prompt: str, user_prompt: str, cache_type: str = "general") -> str:
    """Call the LLM with DB caching. Falls back to deterministic templates on error."""
    # Try DB cache
    try:
        from app.db import SessionLocal
        from app.models import AiContentCache, AiUsageLog
        from sqlalchemy import select

        cache_key = _make_cache_key(system_prompt, user_prompt)
        with SessionLocal() as db:
            cached = db.scalars(
                select(AiContentCache).where(AiContentCache.cache_key == cache_key)
            ).first()
            if cached and (cached.expires_at is None or cached.expires_at > datetime.utcnow()):
                db.add(AiUsageLog(
                    tenant_id=None, feature=cache_type, model=settings.AI_MODEL,
                    prompt_tokens=0, completion_tokens=0, total_tokens=0,
                    latency_ms=0, cache_hit=True,
                ))
                db.commit()
                return cached.output_text
    except Exception:
        pass

    start = time.monotonic()
    try:
        payload = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 1500,
            "temperature": 0.7,
        }
        body_bytes = json.dumps(payload).encode()
        req = urlrequest.Request(
            f"{settings.AI_BASE_URL}/chat/completions",
            data=body_bytes,
            method="POST",
            headers={
                "Authorization": f"Bearer {settings.AI_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        with urlrequest.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        result = data["choices"][0]["message"]["content"]
        latency_ms = int((time.monotonic() - start) * 1000)
        total_tokens = data.get("usage", {}).get("total_tokens", 0)

        # Store in cache
        try:
            from app.db import SessionLocal
            from app.models import AiContentCache, AiUsageLog
            cache_key = _make_cache_key(system_prompt, user_prompt)
            with SessionLocal() as db:
                existing = db.scalars(
                    __import__("sqlalchemy", fromlist=["select"]).select(AiContentCache)
                    .where(AiContentCache.cache_key == cache_key)
                ).first()
                if not existing:
                    db.add(AiContentCache(
                        cache_key=cache_key, content_type=cache_type,
                        input_hash=cache_key[:64], output_text=result,
                        model_used=settings.AI_MODEL, tokens_used=total_tokens,
                        expires_at=datetime.utcnow() + timedelta(days=7),
                    ))
                db.add(AiUsageLog(
                    tenant_id=None, feature=cache_type, model=settings.AI_MODEL,
                    prompt_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                    completion_tokens=data.get("usage", {}).get("completion_tokens", 0),
                    total_tokens=total_tokens, latency_ms=latency_ms, cache_hit=False,
                ))
                db.commit()
        except Exception:
            pass

        return result

    except Exception:
        return _fallback_response(system_prompt, user_prompt)


def _fallback_response(system_prompt: str, user_prompt: str) -> str:
    """Deterministic fallback when LLM is unavailable."""
    sp = system_prompt.lower()
    if "lesson" in sp:
        topic = user_prompt[:50]
        return (
            f"# Learning Module: {topic}\n\n"
            "## Overview\nThis lesson covers key concepts.\n\n"
            "## Key Points\n- Understand fundamentals\n- Apply practically\n- Review regularly\n\n"
            "## Summary\nComplete the assessment to test understanding."
        )
    if "blueprint" in sp:
        return json.dumps({
            "title": "Training Blueprint",
            "description": "Auto-generated training structure",
            "teams": [{"team": "operations", "focus_topics": ["onboarding", "product knowledge"]}],
            "course_outline": [
                {"title": "Onboarding", "modules": [
                    {"title": "Company Overview", "lessons": ["Introduction", "Values", "Products"]},
                    {"title": "Role Training", "lessons": ["Your Role", "Tools", "Processes"]},
                ]}
            ]
        })
    if "simulation" in sp:
        return json.dumps({
            "title": "Workplace Simulation",
            "scenario_text": "A customer contacts you with an issue. How do you handle it?",
            "objectives": ["Active listening", "Problem resolution", "Customer satisfaction"],
        })
    if "question" in sp:
        return json.dumps([{
            "question": "What is the primary objective of this training?",
            "options": {"a": "Company values", "b": "Software tools",
                        "c": "Customer service", "d": "Compliance"},
            "correct_index": 0,
            "explanation": "Understanding company values is foundational.",
        }])
    if "feedback" in sp or "tutor" in sp:
        return json.dumps({
            "feedback": "Good effort! Review the key concepts from this lesson.",
            "follow_up_question": "Can you explain this concept in your own words?",
            "confidence_score": 70,
        })
    if "score" in sp or "assess" in sp:
        return json.dumps({"score": 65, "feedback": "Good response. Keep practicing!"})
    return f"Content generated for: {user_prompt[:100]}"


def build_lesson_content(team: str, focus_topic: str, kpis: List[str]) -> str:
    system_prompt = (
        "You are an expert corporate trainer. Generate a structured lesson in markdown. "
        "Include: overview, key concepts (3-5 points), practical examples, and a summary."
    )
    user_prompt = (
        f"Team: {team}\nFocus Topic: {focus_topic}\n"
        f"KPIs to address: {', '.join(kpis) if kpis else 'performance improvement'}"
    )
    return call_llm(system_prompt, user_prompt, cache_type="lesson")


def generate_questions_for_topic(topic: str, count: int = 5, difficulty: str = "medium") -> List[Dict[str, Any]]:
    system_prompt = (
        "You are an expert quiz maker. Generate MCQ questions as a JSON array. "
        f"Each item: {{question, options: {{a,b,c,d}}, correct_index (0-3), explanation}}. "
        f"Difficulty: {difficulty}. Return ONLY valid JSON array."
    )
    user_prompt = f"Generate {count} questions about: {topic}"
    raw = call_llm(system_prompt, user_prompt, cache_type="quiz_question")
    try:
        import re
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        return json.loads(m.group()) if m else []
    except Exception:
        return [{
            "question": f"What is a key concept of {topic}?",
            "options": {"a": "Concept A", "b": "Concept B", "c": "Concept C", "d": "Concept D"},
            "correct_index": 0, "explanation": f"Tests understanding of {topic}.",
        }]


def generate_tutor_feedback(lesson_title: str, lesson_content: str, learner_answer: str, source_refs: str = "") -> Dict[str, Any]:
    system_prompt = (
        "You are an expert AI tutor. Analyze the learner's answer and provide constructive feedback. "
        "Respond with JSON: {feedback, follow_up_question, confidence_score (0-100)}"
    )
    user_prompt = (
        f"Lesson: {lesson_title}\nContent: {lesson_content[:500]}\n"
        f"Learner Answer: {learner_answer}\nReferences: {source_refs[:200]}"
    )
    raw = call_llm(system_prompt, user_prompt, cache_type="feedback")
    try:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(m.group()) if m else {}
        return {
            "feedback": data.get("feedback", "Good attempt! Review the key concepts."),
            "follow_up_question": data.get("follow_up_question", "Can you explain this in your own words?"),
            "confidence_score": int(data.get("confidence_score", 70)),
        }
    except Exception:
        return {
            "feedback": "Good effort! Focus on the core concepts.",
            "follow_up_question": "What aspect would you like to explore further?",
            "confidence_score": 65,
        }


def evaluate_simulation(scenario_prompt: str, user_response: str) -> Dict[str, Any]:
    system_prompt = (
        "You are an expert assessor for workplace simulations. "
        "Evaluate the response against the scenario. "
        "Respond with JSON: {score (0-100), feedback}"
    )
    user_prompt = f"Scenario:\n{scenario_prompt[:800]}\n\nUser Response:\n{user_response[:500]}"
    raw = call_llm(system_prompt, user_prompt, cache_type="simulation")
    try:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(m.group()) if m else {}
        score = max(0, min(100, int(data.get("score", 60))))
        return {"score": score, "feedback": data.get("feedback", "Good response! Keep practicing.")}
    except Exception:
        words = len(user_response.split())
        score = min(85, 40 + words // 5)
        return {"score": score, "feedback": "Response received. Practice makes perfect!"}
