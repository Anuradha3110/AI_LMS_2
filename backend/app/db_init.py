"""
Database initialization and seeding.
Creates all tables and seeds demo data for 3 tenants with full user sets.
"""
import secrets
import uuid

from sqlalchemy import select

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.models import (
    Tenant, TenantProfile, TenantSubscription,
    User, UserGamification, UserPreference,
    Course, Module, Lesson, Assessment, AssessmentQuestion,
    QuestionBank, BadgeDefinition, LeaveType,
    KnowledgeItem, CompanyBlueprint,
)


def init_db() -> None:
    """Drop and recreate all tables (dev mode only)."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def safe_init() -> None:
    """Create tables if missing and seed demo data once."""
    Base.metadata.create_all(bind=engine)
    _seed_demo_data()


def _seed_demo_data():
    with SessionLocal() as db:
        existing = db.scalars(select(Tenant).where(Tenant.slug == "demo-org")).first()
        if existing:
            return  # Already seeded

        # ── Tenant 1: Demo Organization ──────────────────────────────────
        demo_api_key = "lms_demo_" + secrets.token_urlsafe(16)
        tenant = Tenant(
            name="Demo Organization",
            slug="demo-org",
            plan="pro",
            status="active",
            api_key=demo_api_key,
            max_users=100,
            max_courses=50,
        )
        db.add(tenant)
        db.flush()

        profile = TenantProfile(
            tenant_id=tenant.id,
            business_domain="technology",
            industry="Software",
            primary_color="#4F46E5",
            secondary_color="#7C3AED",
            welcome_message="Welcome to the AI-LMS Demo Platform!",
            role_template_json={
                "admin": {"skills": ["leadership", "strategy"]},
                "manager": {"skills": ["team_management", "performance_tracking"]},
                "employee": {"skills": ["technical", "communication", "product_knowledge"]},
            },
        )
        db.add(profile)

        db.add(TenantSubscription(tenant_id=tenant.id, plan="pro", billing_cycle="monthly", is_active=True))

        # ── Users ─────────────────────────────────────────────────────────
        admin = User(
            tenant_id=tenant.id, email="admin@gmail.com",
            full_name="Admin User", password_hash=hash_password("admin@123"),
            role="admin", department="Management", job_title="System Administrator",
        )
        manager = User(
            tenant_id=tenant.id, email="manager@gmail.com",
            full_name="Sarah Manager", password_hash=hash_password("manager@123"),
            role="manager", department="Operations", job_title="Operations Manager",
        )
        employee = User(
            tenant_id=tenant.id, email="employee@gmail.com",
            full_name="John Employee", password_hash=hash_password("employee@123"),
            role="employee", department="Sales", job_title="Sales Executive",
        )
        db.add_all([admin, manager, employee])
        db.flush()

        # Set manager hierarchy
        employee.manager_id = manager.id

        # Gamification profiles
        for u in [admin, manager, employee]:
            db.add(UserGamification(
                tenant_id=tenant.id, user_id=u.id,
                xp_points={"admin": 500, "manager": 350, "employee": 150}[u.role],
                level={"admin": 5, "manager": 4, "employee": 2}[u.role],
                badges_count={"admin": 8, "manager": 5, "employee": 3}[u.role],
                streak_days={"admin": 15, "manager": 8, "employee": 3}[u.role],
            ))
            db.add(UserPreference(
                user_id=u.id, tenant_id=tenant.id,
                language="en", notification_prefs={"email": True, "in_app": True},
            ))

        # ── Leave Types ───────────────────────────────────────────────────
        for lt_data in [
            {"name": "Casual Leave", "days_allowed": 12, "carry_forward": False},
            {"name": "Sick Leave", "days_allowed": 10, "carry_forward": False},
            {"name": "Earned Leave", "days_allowed": 15, "carry_forward": True},
        ]:
            db.add(LeaveType(tenant_id=tenant.id, **lt_data))

        # ── Badge Definitions ─────────────────────────────────────────────
        badges = [
            {"name": "First Steps", "icon": "🎯", "description": "Complete your first lesson"},
            {"name": "Quick Learner", "icon": "⚡", "description": "Complete 5 lessons in a day"},
            {"name": "Assessment Ace", "icon": "🏆", "description": "Score 100% on an assessment"},
            {"name": "Streak Master", "icon": "🔥", "description": "Maintain a 7-day streak"},
            {"name": "Knowledge Seeker", "icon": "📚", "description": "Complete a full course"},
        ]
        for b in badges:
            db.add(BadgeDefinition(tenant_id=tenant.id, **b, criteria={}))

        # ── Blueprint ─────────────────────────────────────────────────────
        blueprint = CompanyBlueprint(
            tenant_id=tenant.id,
            title="Sales Training Program",
            version=1,
            blueprint_json={
                "title": "Sales Excellence Program",
                "description": "Comprehensive sales training for the team",
                "teams": [{"team": "sales", "focus_topics": ["product_knowledge", "negotiation", "customer_service"]}],
                "course_outline": [
                    {
                        "title": "Product Knowledge",
                        "modules": [
                            {"title": "Product Overview", "lessons": ["Introduction to Products", "Features & Benefits", "Competitive Analysis"]},
                            {"title": "Demo Techniques", "lessons": ["Live Demo Setup", "Handling Objections", "Closing Techniques"]},
                        ]
                    },
                    {
                        "title": "Customer Communication",
                        "modules": [
                            {"title": "Communication Skills", "lessons": ["Active Listening", "Email Etiquette", "Phone Skills"]},
                        ]
                    }
                ]
            },
            source="manual",
            status="ready",
        )
        db.add(blueprint)
        db.flush()

        # ── Course 1: Product Knowledge ───────────────────────────────────
        course1 = Course(
            tenant_id=tenant.id,
            title="Product Knowledge Essentials",
            description="Master our product portfolio and competitive positioning.",
            objectives="Understand products, features, and benefits to effectively sell.",
            category="Sales",
            status="published",
            level="Beginner",
            difficulty="beginner",
            duration_hours=4,
            estimated_hours=4.5,
            certification_enabled=True,
            instructor_name="Admin User",
            tags_json=["sales", "product", "onboarding"],
            is_ai_generated=False,
            blueprint_id=blueprint.id,
        )
        db.add(course1)
        db.flush()

        module1 = Module(
            tenant_id=tenant.id, course_id=course1.id,
            title="Product Overview", order_index=0,
            description="Introduction to our complete product range.",
            estimated_minutes=60,
        )
        module2 = Module(
            tenant_id=tenant.id, course_id=course1.id,
            title="Features & Benefits", order_index=1,
            description="Deep dive into product features and how they benefit customers.",
            estimated_minutes=90,
        )
        db.add_all([module1, module2])
        db.flush()

        lessons_m1 = [
            ("Introduction to Our Products", "# Introduction\n\nWelcome to our product training! In this lesson you will learn about our complete product range.\n\n## Product Categories\n- Category A: Entry-level solutions\n- Category B: Professional tools\n- Category C: Enterprise platforms\n\n## Key Takeaway\nUnderstanding each category helps you match the right product to each customer's needs."),
            ("Market Positioning", "# Market Positioning\n\nUnderstand where our products stand in the market.\n\n## Competitive Advantages\n1. Superior quality\n2. Competitive pricing\n3. Excellent support\n\n## Target Customers\nOur primary customers are SMBs and enterprise clients looking for reliable solutions."),
            ("Customer Profiles", "# Customer Profiles\n\nLearn to identify ideal customer profiles.\n\n## Profile Types\n- **Growth-stage Startups**: Need scalable solutions\n- **Established SMBs**: Value reliability and support\n- **Enterprise**: Require customization and SLAs"),
        ]
        for idx, (title, content) in enumerate(lessons_m1):
            db.add(Lesson(
                tenant_id=tenant.id, module_id=module1.id,
                title=title, content_text=content, order_index=idx,
            ))

        # Assessment for module 1
        assess1 = Assessment(
            tenant_id=tenant.id, module_id=module1.id,
            title="Product Overview Quiz",
            passing_score=70, marks_per_question=2, time_limit_minutes=15,
        )
        db.add(assess1)
        db.flush()

        quiz_questions = [
            ("How many main product categories do we have?", {"a": "2", "b": "3", "c": "4", "d": "5"}, 1, "We have 3 product categories: A, B, and C."),
            ("Which customer type values scalability most?", {"a": "Enterprise", "b": "Growth-stage Startups", "c": "Established SMBs", "d": "Non-profits"}, 1, "Growth-stage startups need solutions that scale with their growth."),
            ("What is our primary competitive advantage?", {"a": "Lowest price", "b": "Superior quality", "c": "Largest market share", "d": "Oldest brand"}, 1, "Superior quality is our primary competitive differentiator."),
            ("Which segment requires customization and SLAs?", {"a": "Startups", "b": "SMBs", "c": "Enterprise", "d": "Freelancers"}, 2, "Enterprise clients need customized solutions with guaranteed SLAs."),
            ("What does matching the right product to customer needs improve?", {"a": "Company revenue only", "b": "Customer satisfaction and sales success", "c": "Only employee productivity", "d": "Brand recognition alone"}, 1, "Proper product matching improves both customer satisfaction and sales outcomes."),
        ]
        for q_text, opts, correct_idx, explanation in quiz_questions:
            q = AssessmentQuestion(
                tenant_id=tenant.id, assessment_id=assess1.id,
                question_text=q_text, question_type="mcq",
                options_json=opts, correct_answer_index=correct_idx, marks=2,
            )
            db.add(q)
            # Also add to question bank
            db.add(QuestionBank(
                tenant_id=tenant.id, question_text=q_text, question_type="mcq",
                options_json=opts,
                correct_answer_json={"index": correct_idx},
                explanation=explanation,
                difficulty="easy", domain="sales", is_ai_generated=False,
                review_status="approved",
            ))

        # ── Course 2: Communication Skills ────────────────────────────────
        course2 = Course(
            tenant_id=tenant.id,
            title="Customer Communication Mastery",
            description="Develop exceptional communication skills for customer-facing roles.",
            objectives="Master active listening, email etiquette, and phone communication.",
            category="Communication",
            status="published",
            level="Intermediate",
            difficulty="intermediate",
            duration_hours=3,
            estimated_hours=3.5,
            instructor_name="Sarah Manager",
            tags_json=["communication", "customer_service", "soft_skills"],
        )
        db.add(course2)
        db.flush()

        module3 = Module(
            tenant_id=tenant.id, course_id=course2.id,
            title="Active Listening", order_index=0,
            estimated_minutes=45,
        )
        db.add(module3)
        db.flush()

        db.add(Lesson(
            tenant_id=tenant.id, module_id=module3.id, order_index=0,
            title="The Art of Active Listening",
            content_text="# Active Listening\n\nActive listening is the foundation of great customer communication.\n\n## Key Techniques\n1. **Give full attention** — Put away distractions\n2. **Show engagement** — Nod, use acknowledgments\n3. **Reflect back** — Paraphrase what you heard\n4. **Ask clarifying questions** — Ensure full understanding\n\n## Practice Exercise\nIn your next customer call, count how many times you genuinely paraphrase the customer's concern.",
        ))

        # ── Knowledge Items ───────────────────────────────────────────────
        knowledge_items = [
            ("Product A: CRM Suite", "An enterprise CRM solution for managing customer relationships.", "Products", "CRM"),
            ("Sales Process Guide", "Step-by-step guide to our standard sales process.", "Processes", "Sales"),
            ("Customer Objection Handling", "Common objections and proven responses for our sales team.", "Playbook", "Sales"),
            ("Onboarding Checklist", "Complete checklist for new employee onboarding.", "HR", "Operations"),
            ("Product Pricing Guide", "Current pricing tiers and discount policies.", "Products", "Finance"),
        ]
        for title, desc, tab, team_hint in knowledge_items:
            db.add(KnowledgeItem(
                tenant_id=tenant.id,
                source_kind="manual", source_tab=tab,
                source_gid="0", source_row=0, source_url="",
                canonical_key=f"manual::{title.lower().replace(' ', '_')}",
                title=title, description=desc,
                category=tab, service_type=team_hint, team_hint=team_hint.lower(),
                content=desc, content_type="text",
            ))

        db.commit()
        print(f"[db_init] Demo data seeded successfully for tenant: {tenant.name}")
        print(f"[db_init] API Key: {demo_api_key}")
        print("[db_init] Demo accounts: admin@gmail.com / admin@123 | manager@gmail.com / manager@123 | employee@gmail.com / employee@123")
