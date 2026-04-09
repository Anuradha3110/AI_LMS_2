import uuid

from sqlalchemy import select

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.models import (
    Assignment,
    Course,
    CompanyBlueprint,
    Lesson,
    LessonProgress,
    Module,
    Assessment,
    AssessmentQuestion,
    SkillScorecard,
    Tenant,
    User,
)


def init_db() -> None:
    # Drop all tables and recreate to pick up any schema changes (dev mode).
    # Safe here because all data is re-seeded below.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_demo_data() -> None:
    # Only seed if empty to avoid duplication on reload.
    with SessionLocal() as db:
        tenant = db.scalar(select(Tenant).limit(1))
        if not tenant:
            tenant = Tenant(id=uuid.uuid4(), name="Demo College")
            db.add(tenant)
            db.flush()

        # Reconcile demo user roles on every startup (important during early refactors).
        demo_users = [
            ("admin@gmail.com", "Demo Admin", "admin", "admin@123"),
            ("manager@gmail.com", "Demo Manager", "manager", "manager@123"),
            ("employee@gmail.com", "Demo Employee", "employee", "employee@123"),
        ]
        for email, full_name, role, raw_password in demo_users:
            user = db.scalar(select(User).where(User.email == email, User.tenant_id == tenant.id))
            if not user:
                user = User(
                    tenant_id=tenant.id,
                    email=email,
                    full_name=full_name,
                    password_hash=hash_password(raw_password),
                    role=role,
                    is_active=True,
                )
                db.add(user)
            else:
                user.full_name = full_name
                user.password_hash = hash_password(raw_password)
                user.role = role
                user.is_active = True
        db.flush()

        blueprint_exists = db.scalar(
            select(CompanyBlueprint.id).where(CompanyBlueprint.tenant_id == tenant.id).limit(1)
        )
        if not blueprint_exists:
            # Create a small starter blueprint + LMS skeleton.
            blueprint = CompanyBlueprint(
                tenant_id=tenant.id,
                version=1,
                blueprint_json={
                    "teams": ["Sales", "Support"],
                    "kpis": ["conversion_rate", "resolution_time"],
                    "training_focus": ["objection_handling", "SOP_compliance"],
                    "simulation_required": True,
                },
            )
            db.add(blueprint)
            db.flush()

            course = Course(
                tenant_id=tenant.id,
                title="Adaptive Onboarding (Demo)",
                description="Starter course for demo purposes.",
                objectives="Understand the LMS platform and complete the first module.",
                category="General",
                thumbnail_url="",
                status="published",
                duration_hours=2,
                progress_tracking_enabled=True,
                certification_enabled=False,
            )
            db.add(course)
            db.flush()

            module = Module(
                tenant_id=tenant.id,
                course_id=course.id,
                title="Core Concepts",
                description="Introduction to the key concepts covered in this course.",
                section_title="Introduction",
                order_index=0,
            )
            db.add(module)
            db.flush()

            lesson = Lesson(
                tenant_id=tenant.id,
                module_id=module.id,
                title="Welcome to the LMS",
                content_text="This is a scaffolded lesson. Phase 1 will populate lessons via blueprint generation.",
                video_url="",
                subtitle_url="",
                reading_materials_json=[],
                downloadable_resources_json=[],
                order_index=0,
            )
            db.add(lesson)

            assessment = Assessment(
                tenant_id=tenant.id,
                module_id=module.id,
                title="Quick Knowledge Check",
                assessment_type="quiz",
                passing_score=60,
                time_limit_minutes=0,
                marks_per_question=1,
            )
            db.add(assessment)
            db.flush()

            # One question for scaffolding.
            q = AssessmentQuestion(
                tenant_id=tenant.id,
                assessment_id=assessment.id,
                question_text="What does the AI Tutor primarily provide?",
                question_type="mcq",
                options_json={"a": "Static content only", "b": "Role-aware tutoring", "c": "Random feedback", "d": "No feedback"},
                correct_answer_index=1,
                marks=1,
            )
            db.add(q)
            db.flush()

        db.commit()

    # ── Sales Fundamentals course (always ensure it exists) ──────────
    with SessionLocal() as db:
        tenant = db.scalar(select(Tenant).limit(1))
        if not tenant:
            db.commit()
            return

        sales_exists = db.scalar(
            select(Course.id).where(
                Course.tenant_id == tenant.id,
                Course.title == "Sales Fundamentals & Product Mastery",
            ).limit(1)
        )
        if sales_exists:
            db.commit()
            return

        sales_course = Course(
            tenant_id=tenant.id,
            title="Sales Fundamentals & Product Mastery",
            description=(
                "This course provides a complete foundation in sales, covering customer psychology, "
                "product knowledge, communication skills, and closing techniques. It is designed to "
                "help learners increase conversions and drive revenue growth."
            ),
            objectives=(
                "Understand sales fundamentals and the role of a salesperson; "
                "master product knowledge and competitive positioning; "
                "develop effective customer communication skills; "
                "apply proven sales pitch and closing techniques; "
                "measure and optimize sales performance using key metrics."
            ),
            category="Sales",
            thumbnail_url="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
            status="published",
            duration_hours=35,
            progress_tracking_enabled=True,
            certification_enabled=True,
            instructor_name="Rajesh Sharma",
        )
        db.add(sales_course)
        db.flush()

        # ── Helper to build a module + lessons + assessment + assignment ──
        def _add_module(course_id, title, description, section_title, order_index,
                        lessons_data, quiz_title, quiz_questions, assignment_data):
            mod = Module(
                tenant_id=tenant.id,
                course_id=course_id,
                title=title,
                description=description,
                section_title=section_title,
                order_index=order_index,
            )
            db.add(mod)
            db.flush()

            for idx, (ltitle, lcontent, lvideo, lreading) in enumerate(lessons_data):
                lesson = Lesson(
                    tenant_id=tenant.id,
                    module_id=mod.id,
                    title=ltitle,
                    content_text=lcontent,
                    video_url=lvideo,
                    subtitle_url="",
                    reading_materials_json=lreading,
                    downloadable_resources_json=[],
                    order_index=idx,
                )
                db.add(lesson)

            assessment = Assessment(
                tenant_id=tenant.id,
                module_id=mod.id,
                title=quiz_title,
                assessment_type="quiz",
                passing_score=60,
                time_limit_minutes=15,
                marks_per_question=1,
            )
            db.add(assessment)
            db.flush()

            for q_text, q_opts, q_correct in quiz_questions:
                q = AssessmentQuestion(
                    tenant_id=tenant.id,
                    assessment_id=assessment.id,
                    question_text=q_text,
                    question_type="mcq",
                    options_json=q_opts,
                    correct_answer_index=q_correct,
                    marks=1,
                )
                db.add(q)

            a_title, a_desc, a_guide = assignment_data
            assignment = Assignment(
                tenant_id=tenant.id,
                module_id=mod.id,
                title=a_title,
                description=a_desc,
                guidelines=a_guide,
                deadline=None,
            )
            db.add(assignment)

        # ── Module 1: Introduction to Sales Fundamentals ──────────────
        _add_module(
            course_id=sales_course.id,
            title="Introduction to Sales Fundamentals",
            description="Explore the core concepts of sales, the salesperson's role, and the difference between B2B and B2C sales models.",
            section_title="Week 1",
            order_index=0,
            lessons_data=[
                (
                    "What is Sales?",
                    "Sales is the process of persuading a potential customer to purchase a product or service. "
                    "It involves understanding customer needs, building trust, and demonstrating value. "
                    "Sales is not just about pushing products — it is about solving problems and creating "
                    "mutually beneficial relationships. Every interaction in sales is an opportunity to build "
                    "rapport, uncover needs, and guide prospects toward a decision that benefits them.",
                    "https://www.youtube.com/results?search_query=what+is+sales+introduction",
                    [{"label": "Suggested Video: Introduction to Sales (YouTube Search)", "url": "https://www.youtube.com/results?search_query=introduction+to+sales+fundamentals"},
                     {"label": "Article: What Is Sales? Definition, Types, and Process", "url": "https://blog.hubspot.com/sales/what-is-sales"}],
                ),
                (
                    "Role of a Salesperson",
                    "A salesperson acts as the bridge between a company and its customers. Key responsibilities include "
                    "prospecting new leads, qualifying opportunities, conducting product demos, negotiating deals, "
                    "and nurturing long-term client relationships. Successful salespeople combine emotional intelligence, "
                    "product expertise, and strategic thinking. They listen more than they talk and always focus on "
                    "delivering value rather than just making a sale.",
                    "https://www.youtube.com/results?search_query=role+of+a+salesperson",
                    [{"label": "Suggested Video: Day in the Life of a Sales Rep (YouTube Search)", "url": "https://www.youtube.com/results?search_query=day+in+the+life+of+a+sales+representative"},
                     {"label": "Article: What Does a Sales Representative Do?", "url": "https://www.salesforce.com/blog/what-does-a-sales-rep-do/"}],
                ),
                (
                    "Types of Sales (B2B/B2C)",
                    "Business-to-Business (B2B) sales involve selling products or services from one business to another. "
                    "These deals are typically larger, involve longer sales cycles, and require navigating multiple "
                    "decision-makers. Business-to-Consumer (B2C) sales are direct transactions with individual customers, "
                    "featuring shorter cycles and emotion-driven decisions. Understanding which model applies to your role "
                    "helps tailor your sales approach, messaging, and relationship management strategy.",
                    "https://www.youtube.com/results?search_query=b2b+vs+b2c+sales",
                    [{"label": "Suggested Video: B2B vs B2C Sales Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=b2b+vs+b2c+sales+explained"},
                     {"label": "Article: B2B vs B2C Sales: Key Differences", "url": "https://blog.hubspot.com/sales/b2b-vs-b2c"}],
                ),
            ],
            quiz_title="Module 1 Quiz — Sales Fundamentals",
            quiz_questions=[
                (
                    "What is the primary goal of sales?",
                    {"a": "Convince customers to buy at any cost", "b": "Solve customer problems with products or services", "c": "Increase company revenue by all means", "d": "Build a large contact database"},
                    1,
                ),
                (
                    "Which of the following best describes B2B sales?",
                    {"a": "Selling to individual consumers directly", "b": "Selling through online marketplaces", "c": "Selling products or services to other businesses", "d": "Online retail flash sales"},
                    2,
                ),
                (
                    "What is a key characteristic of a successful salesperson?",
                    {"a": "Talking quickly to close deals faster", "b": "Active listening and empathy toward customers", "c": "Always offering the deepest discount", "d": "Avoiding difficult objections"},
                    1,
                ),
                (
                    "What does 'B2C' stand for?",
                    {"a": "Business to Commerce", "b": "Buy to Customer", "c": "Business to Consumer", "d": "Brand to Client"},
                    2,
                ),
                (
                    "Which sales type typically involves longer sales cycles?",
                    {"a": "B2C direct retail sales", "b": "Impulse-buy e-commerce", "c": "B2B enterprise sales", "d": "Street-level vendor sales"},
                    2,
                ),
            ],
            assignment_data=(
                "Sales Role Identification",
                "Research three companies in your industry. For each company, identify the type of sales model "
                "they use (B2B, B2C, or both), describe the role of their salespeople, and explain how their "
                "sales approach differs from each other.",
                "Document your findings in a 1–2 page report. Include: company name, sales model, salesperson "
                "responsibilities, and key differences in approach. Use real-world examples and cite sources.",
            ),
        )

        # ── Module 2: Product Knowledge & Positioning ─────────────────
        _add_module(
            course_id=sales_course.id,
            title="Product Knowledge & Positioning",
            description="Learn how to deeply understand your product, articulate benefits over features, and position your offering competitively in the market.",
            section_title="Week 2",
            order_index=1,
            lessons_data=[
                (
                    "Understanding Product Features",
                    "Product features are the specific characteristics or functionalities of what you sell. "
                    "A salesperson must have thorough knowledge of every feature — from technical specs to "
                    "ease of use — to answer customer questions confidently. Deep product knowledge builds "
                    "credibility. Use product demos, documentation, and hands-on experience to develop "
                    "expertise. Remember: you cannot sell what you do not fully understand.",
                    "https://www.youtube.com/results?search_query=product+knowledge+for+sales",
                    [{"label": "Suggested Video: Product Knowledge Training for Sales Teams (YouTube Search)", "url": "https://www.youtube.com/results?search_query=product+knowledge+training+sales"},
                     {"label": "Article: Why Product Knowledge Is Important in Sales", "url": "https://blog.hubspot.com/sales/product-knowledge"}],
                ),
                (
                    "Benefits vs Features",
                    "Features tell; benefits sell. A feature is what a product does (e.g., '10,000 mAh battery'). "
                    "A benefit is what the customer gains (e.g., 'Never run out of power during an important meeting'). "
                    "Great salespeople always translate features into customer-specific benefits. When presenting, "
                    "ask yourself: 'So what does this mean for my customer?' Then communicate the answer clearly "
                    "and emotionally to connect with the buyer's motivations.",
                    "https://www.youtube.com/results?search_query=features+vs+benefits+sales+training",
                    [{"label": "Suggested Video: Features vs Benefits in Sales (YouTube Search)", "url": "https://www.youtube.com/results?search_query=features+vs+benefits+selling"},
                     {"label": "Article: Features vs. Benefits: What's the Difference?", "url": "https://blog.hubspot.com/sales/features-vs-benefits"}],
                ),
                (
                    "Competitive Positioning",
                    "Competitive positioning defines how your product is uniquely valuable compared to alternatives "
                    "in the market. It answers the question: 'Why should a customer choose us over the competition?' "
                    "Key steps include: identifying your Unique Selling Proposition (USP), understanding competitor "
                    "weaknesses, and crafting a positioning statement. Effective positioning requires ongoing market "
                    "research, win/loss analysis, and customer feedback to stay relevant.",
                    "https://www.youtube.com/results?search_query=competitive+positioning+sales",
                    [{"label": "Suggested Video: How to Position Your Product (YouTube Search)", "url": "https://www.youtube.com/results?search_query=product+positioning+strategy+sales"},
                     {"label": "Article: What Is Competitive Positioning?", "url": "https://www.salesforce.com/blog/competitive-positioning/"}],
                ),
            ],
            quiz_title="Module 2 Quiz — Product Knowledge",
            quiz_questions=[
                (
                    "What is the difference between a feature and a benefit?",
                    {"a": "Features describe what the product does; benefits explain how it helps the customer", "b": "Benefits are technical; features are emotional", "c": "They mean the same thing in sales", "d": "Features are always more important than benefits"},
                    0,
                ),
                (
                    "Which strategy focuses on how your product compares to competitors?",
                    {"a": "Price leadership positioning", "b": "Value chain positioning", "c": "Competitive positioning", "d": "Brand awareness positioning"},
                    2,
                ),
                (
                    "Why is product knowledge important for a salesperson?",
                    {"a": "It helps avoid customer questions entirely", "b": "It builds credibility and customer confidence", "c": "It reduces the need to listen to customers", "d": "It shortens the sales call time"},
                    1,
                ),
                (
                    "What is a Unique Selling Proposition (USP)?",
                    {"a": "A price advantage over competitors", "b": "The specific benefit that differentiates your product from all others", "c": "A catchy marketing slogan", "d": "The product warranty terms"},
                    1,
                ),
                (
                    "When should you highlight benefits over features?",
                    {"a": "Only during the final product demo", "b": "Always — in every sales conversation at every stage", "c": "Only at the closing stage", "d": "Only when the customer specifically asks for it"},
                    1,
                ),
            ],
            assignment_data=(
                "Product Feature-Benefit Mapping",
                "Select a product or service you know well (real or imagined). Create a Feature-Benefit Matrix "
                "that lists at least 5 features and maps each to its corresponding customer benefit. Then write "
                "a 3-sentence competitive positioning statement for the product.",
                "Use a table format for the matrix. Ensure each benefit speaks to a specific customer pain point. "
                "Your positioning statement must clearly differentiate the product from at least one competitor. "
                "Submit as a document or spreadsheet.",
            ),
        )

        # ── Module 3: Customer Communication Skills ───────────────────
        _add_module(
            course_id=sales_course.id,
            title="Customer Communication Skills",
            description="Develop the interpersonal skills needed to build strong relationships, ask the right questions, and handle objections with confidence.",
            section_title="Week 3",
            order_index=2,
            lessons_data=[
                (
                    "Building Rapport",
                    "Rapport is the foundation of every successful sales relationship. Building rapport means "
                    "creating a genuine connection with your prospect based on trust, mutual respect, and shared "
                    "understanding. Techniques include: mirroring body language, using the customer's name, finding "
                    "common ground, and showing genuine interest in their goals. Rapport is not manipulation — it "
                    "is authentic relationship-building that makes customers feel valued and understood.",
                    "https://www.youtube.com/results?search_query=building+rapport+in+sales",
                    [{"label": "Suggested Video: How to Build Rapport with Customers (YouTube Search)", "url": "https://www.youtube.com/results?search_query=building+rapport+with+customers+sales"},
                     {"label": "Article: Building Rapport in Sales: Tips and Techniques", "url": "https://blog.hubspot.com/sales/rapport-building"}],
                ),
                (
                    "Effective Questioning",
                    "Questions are a salesperson's most powerful tool. Open-ended questions encourage customers to "
                    "share information, feelings, and needs (e.g., 'What challenges are you currently facing?'). "
                    "Closed questions confirm specifics (e.g., 'Is Tuesday a good time for a demo?'). SPIN Selling "
                    "uses four question types: Situation, Problem, Implication, and Need-Payoff. Effective questioning "
                    "uncovers hidden needs, builds engagement, and steers conversations toward value-based solutions.",
                    "https://www.youtube.com/results?search_query=effective+questioning+techniques+sales",
                    [{"label": "Suggested Video: SPIN Selling Question Techniques (YouTube Search)", "url": "https://www.youtube.com/results?search_query=spin+selling+questions+sales"},
                     {"label": "Article: The Ultimate Guide to Sales Questions", "url": "https://blog.hubspot.com/sales/sales-questions"}],
                ),
                (
                    "Handling Objections",
                    "Objections are not rejections — they are opportunities to provide more information. Common "
                    "objections include: 'It's too expensive,' 'We're happy with our current provider,' and "
                    "'I need to think about it.' The LAER framework helps: Listen (fully), Acknowledge (validate), "
                    "Explore (ask clarifying questions), Respond (with evidence and value). Always remain calm, "
                    "empathetic, and solution-focused when handling objections.",
                    "https://www.youtube.com/results?search_query=handling+objections+in+sales",
                    [{"label": "Suggested Video: How to Handle Sales Objections (YouTube Search)", "url": "https://www.youtube.com/results?search_query=how+to+handle+sales+objections+effectively"},
                     {"label": "Article: Overcoming Sales Objections: 40+ Examples and Responses", "url": "https://blog.hubspot.com/sales/handling-common-sales-objections"}],
                ),
            ],
            quiz_title="Module 3 Quiz — Customer Communication",
            quiz_questions=[
                (
                    "Building rapport with a customer primarily helps to:",
                    {"a": "Speed up the transaction process", "b": "Establish trust and genuine connection", "c": "Reduce the number of product explanations needed", "d": "Avoid price negotiations altogether"},
                    1,
                ),
                (
                    "What type of questions encourage customers to share more detailed information?",
                    {"a": "Closed yes/no questions", "b": "Leading questions", "c": "Open-ended questions", "d": "Hypothetical trap questions"},
                    2,
                ),
                (
                    "How should a salesperson handle a common objection?",
                    {"a": "Ignore it and continue the pitch", "b": "Argue with facts until the customer concedes", "c": "Acknowledge, clarify, and respond constructively with value", "d": "Immediately offer a deeper discount"},
                    2,
                ),
                (
                    "Active listening in sales means:",
                    {"a": "Nodding while planning your next statement", "b": "Fully focusing on and understanding the customer's message before responding", "c": "Waiting quietly for your turn to speak", "d": "Only taking written notes during the call"},
                    1,
                ),
                (
                    "Which communication skill is most important for uncovering customer needs?",
                    {"a": "High-pressure persuasion", "b": "Polished storytelling only", "c": "Effective questioning", "d": "Rapid-fire presenting"},
                    2,
                ),
            ],
            assignment_data=(
                "Objection Handling Roleplay Script",
                "Write a simulated sales conversation where a customer raises three common objections: "
                "(1) 'It's too expensive,' (2) 'I need to think about it,' and (3) 'We're happy with our "
                "current provider.' Write your ideal response to each objection.",
                "Each response must: (1) Acknowledge the objection empathetically, (2) Ask a clarifying question, "
                "(3) Provide a value-based counter-response. Keep each response under 100 words. Format as a "
                "two-column table: Customer Objection | Salesperson Response.",
            ),
        )

        # ── Module 4: Sales Pitch & Closing Techniques ────────────────
        _add_module(
            course_id=sales_course.id,
            title="Sales Pitch & Closing Techniques",
            description="Craft compelling sales pitches, master negotiation strategies, and apply proven closing techniques to increase conversion rates.",
            section_title="Week 4",
            order_index=3,
            lessons_data=[
                (
                    "Crafting a Sales Pitch",
                    "A powerful sales pitch is concise, customer-focused, and clearly communicates value. "
                    "The structure: (1) Hook — grab attention with a compelling statement or question, "
                    "(2) Problem — identify the pain point your customer faces, (3) Solution — present your "
                    "product as the answer, (4) Proof — use data, testimonials, or case studies, "
                    "(5) Call-to-Action — ask for the next step. Tailor every pitch to the specific prospect "
                    "using research. Avoid generic, feature-heavy pitches.",
                    "https://www.youtube.com/results?search_query=how+to+craft+a+sales+pitch",
                    [{"label": "Suggested Video: How to Create the Perfect Sales Pitch (YouTube Search)", "url": "https://www.youtube.com/results?search_query=how+to+create+perfect+sales+pitch"},
                     {"label": "Article: The 7 Components of a Perfect Sales Pitch", "url": "https://blog.hubspot.com/sales/sales-pitch"}],
                ),
                (
                    "Negotiation Skills",
                    "Negotiation is about finding a mutually beneficial outcome, not winning at the customer's "
                    "expense. Key principles: (1) Know your BATNA (Best Alternative to a Negotiated Agreement), "
                    "(2) Anchor high — start with your full value proposition, (3) Trade concessions strategically "
                    "rather than giving them away freely, (4) Focus on value, not price. Great negotiators "
                    "are patient, listen carefully, and always look for creative solutions that satisfy "
                    "both parties.",
                    "https://www.youtube.com/results?search_query=sales+negotiation+skills+training",
                    [{"label": "Suggested Video: Sales Negotiation Skills (YouTube Search)", "url": "https://www.youtube.com/results?search_query=sales+negotiation+skills+tactics"},
                     {"label": "Article: 12 Important Negotiation Skills", "url": "https://www.indeed.com/career-advice/career-development/negotiation-skills"}],
                ),
                (
                    "Closing Strategies",
                    "Closing is asking for the commitment to move forward. Common techniques include: "
                    "Summary Close (recap all agreed benefits, then ask), Assumptive Close (assume the sale "
                    "and proceed), Urgency Close (create a time-sensitive reason to decide), and Question Close "
                    "(ask a question that surfaces the remaining concern). The best close is the one that feels "
                    "natural and is based on genuinely solving the customer's problem. Always earn the close "
                    "through the quality of your entire sales process.",
                    "https://www.youtube.com/results?search_query=sales+closing+techniques",
                    [{"label": "Suggested Video: Top Sales Closing Techniques (YouTube Search)", "url": "https://www.youtube.com/results?search_query=best+sales+closing+techniques"},
                     {"label": "Article: 20 Powerful Sales Closing Techniques", "url": "https://blog.hubspot.com/sales/sales-closing-techniques-and-why-they-work"}],
                ),
            ],
            quiz_title="Module 4 Quiz — Pitch & Closing",
            quiz_questions=[
                (
                    "A strong sales pitch should primarily focus on:",
                    {"a": "Detailed product specifications and certifications", "b": "The company's long history and awards", "c": "Customer pain points and how your solution resolves them", "d": "Price advantages over every competitor"},
                    2,
                ),
                (
                    "Which closing technique involves summarizing benefits before asking for the sale?",
                    {"a": "Assumptive close", "b": "Summary close", "c": "Urgency / scarcity close", "d": "Trial close"},
                    1,
                ),
                (
                    "What is the best approach when a customer says 'I need to think about it'?",
                    {"a": "Give up and move on immediately", "b": "Push much harder to close right now", "c": "Understand their specific concerns and address them with evidence", "d": "Offer a 50% discount immediately"},
                    2,
                ),
                (
                    "Negotiation in sales is primarily about:",
                    {"a": "Always getting the highest possible price", "b": "Finding mutually beneficial outcomes for both parties", "c": "Convincing the customer to accept all your terms", "d": "Eliminating all objections before the final meeting"},
                    1,
                ),
                (
                    "Which is an example of an assumptive close?",
                    {"a": "'Would you like to buy this product today?'", "b": "'What do you think about our offer overall?'", "c": "'Should I go ahead and set up your account now?'", "d": "'Can I offer you an additional discount?'"},
                    2,
                ),
            ],
            assignment_data=(
                "30-Second Sales Pitch Script",
                "Write and script a 30-second sales pitch for a product of your choice. The pitch must include: "
                "(1) a compelling opening hook, (2) the key customer problem you solve, "
                "(3) your unique value proposition, and (4) a clear call-to-action.",
                "Submit a written script (approximately 75–100 words). The pitch must be clear, concise, and "
                "customer-focused. Avoid technical jargon. Optionally record yourself delivering the pitch and "
                "include a self-assessment: what worked well and what you would improve.",
            ),
        )

        # ── Module 5: Sales Performance & Forecasting ─────────────────
        _add_module(
            course_id=sales_course.id,
            title="Sales Performance & Forecasting",
            description="Understand the key metrics that drive sales performance, manage your pipeline effectively, and build accurate revenue forecasts.",
            section_title="Week 5",
            order_index=4,
            lessons_data=[
                (
                    "Sales Metrics",
                    "Sales metrics are quantitative measures that track and evaluate individual and team performance. "
                    "Key metrics include: Conversion Rate (leads to customers), Average Deal Size, Sales Cycle Length, "
                    "Win Rate, Customer Acquisition Cost (CAC), and Customer Lifetime Value (CLV). Tracking these "
                    "metrics helps identify strengths, spot bottlenecks, and make data-driven decisions. "
                    "Use your CRM to monitor metrics in real time and set benchmarks for improvement.",
                    "https://www.youtube.com/results?search_query=sales+metrics+kpis+explained",
                    [{"label": "Suggested Video: Key Sales Metrics Every Rep Should Track (YouTube Search)", "url": "https://www.youtube.com/results?search_query=key+sales+metrics+kpis"},
                     {"label": "Article: 18 Sales KPIs That Will Improve Your Team's Performance", "url": "https://blog.hubspot.com/sales/sales-metrics"}],
                ),
                (
                    "Pipeline Management",
                    "A sales pipeline is a visual representation of prospects at each stage of your sales process. "
                    "Stages typically include: Prospecting, Qualification, Needs Analysis, Proposal, Negotiation, "
                    "and Closed Won/Lost. Effective pipeline management means: regularly reviewing deals at each stage, "
                    "identifying stalled opportunities, prioritizing high-value prospects, and maintaining a healthy "
                    "mix of early and late-stage deals. A well-managed pipeline leads to predictable revenue.",
                    "https://www.youtube.com/results?search_query=sales+pipeline+management",
                    [{"label": "Suggested Video: How to Manage a Sales Pipeline (YouTube Search)", "url": "https://www.youtube.com/results?search_query=how+to+manage+sales+pipeline+effectively"},
                     {"label": "Article: Sales Pipeline Management: A Complete Guide", "url": "https://blog.hubspot.com/sales/sales-pipeline"}],
                ),
                (
                    "Revenue Forecasting Basics",
                    "Revenue forecasting is the process of estimating future sales revenue over a specific period. "
                    "Methods include: Historical Analysis (trend-based), Pipeline Forecasting (stage-based weighted "
                    "probability), and Bottom-Up Forecasting (rep-by-rep projections). Accurate forecasts help "
                    "businesses plan resources, manage cash flow, and set realistic targets. Key inputs: "
                    "pipeline value, historical win rates, average deal size, and sales cycle length. "
                    "Always communicate forecast confidence levels clearly.",
                    "https://www.youtube.com/results?search_query=sales+revenue+forecasting+basics",
                    [{"label": "Suggested Video: Sales Forecasting Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=sales+forecasting+methods+for+beginners"},
                     {"label": "Article: How to Create a Sales Forecast", "url": "https://blog.hubspot.com/sales/sales-forecast"}],
                ),
            ],
            quiz_title="Module 5 Quiz — Performance & Forecasting",
            quiz_questions=[
                (
                    "What is a sales pipeline?",
                    {"a": "A physical distribution channel for products", "b": "A visualization of prospects at different stages of the buying process", "c": "A product distribution network managed by logistics", "d": "The name of a popular CRM software"},
                    1,
                ),
                (
                    "Which metric measures the percentage of leads that become paying customers?",
                    {"a": "Average revenue per user", "b": "Total deal value in pipeline", "c": "Conversion rate", "d": "Lead velocity rate"},
                    2,
                ),
                (
                    "Revenue forecasting helps a business primarily to:",
                    {"a": "Increase product prices strategically", "b": "Plan resources and set realistic revenue targets", "c": "Reduce the marketing budget", "d": "Decide when to hire more developers"},
                    1,
                ),
                (
                    "What does pipeline management in sales involve?",
                    {"a": "Managing product manufacturing pipelines", "b": "Tracking and optimizing deals through each stage of the sales process", "c": "Managing the sales team's work schedules", "d": "Monitoring factory output and delivery timelines"},
                    1,
                ),
                (
                    "Which of the following is a leading indicator of future sales performance?",
                    {"a": "Total revenue closed last quarter", "b": "Net profit margin year-to-date", "c": "Number of sales activities such as calls, demos, and follow-ups", "d": "Customer retention rate from 12 months ago"},
                    2,
                ),
            ],
            assignment_data=(
                "Personal Sales Performance Dashboard",
                "Create a mock sales performance dashboard for a hypothetical sales representative. "
                "Include: (1) weekly activity metrics (calls, emails, demos), (2) conversion rate, "
                "(3) pipeline value at each stage, and (4) a 4-week revenue forecast with assumptions.",
                "Use a spreadsheet or diagram. Include at least 3 pipeline stages with deal counts and values. "
                "Your forecast should be based on historical conversion rates you define. "
                "Write a 150-word analysis explaining what the data tells you about the rep's performance "
                "and what you would recommend to improve results.",
            ),
        )

        db.commit()

    # ── HR & Workplace Compliance Essentials course ──────────────────
    with SessionLocal() as db:
        tenant = db.scalar(select(Tenant).limit(1))
        if not tenant:
            db.commit()
            return

        hr_exists = db.scalar(
            select(Course.id).where(
                Course.tenant_id == tenant.id,
                Course.title == "HR & Workplace Compliance Essentials",
            ).limit(1)
        )
        if hr_exists:
            db.commit()
            return

        hr_course = Course(
            tenant_id=tenant.id,
            title="HR & Workplace Compliance Essentials",
            description=(
                "This course provides a comprehensive understanding of HR practices and workplace compliance, "
                "including employee management, company policies, labor laws, and ethical standards. "
                "It helps managers ensure a safe, fair, and legally compliant work environment."
            ),
            objectives=(
                "Understand the core functions and strategic role of Human Resources; "
                "apply workplace ethics, anti-harassment policies, and code of conduct standards; "
                "navigate Indian labor laws and ensure employer legal compliance; "
                "implement structured hiring, onboarding, and documentation practices; "
                "manage performance appraisals, employee relations, and workplace conflict resolution."
            ),
            category="HR & Compliance",
            thumbnail_url="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
            status="published",
            duration_hours=25,
            progress_tracking_enabled=True,
            certification_enabled=True,
            instructor_name="Anuradha Biswas",
        )
        db.add(hr_course)
        db.flush()

        def _add_hr_module(course_id, title, description, section_title, order_index,
                           lessons_data, quiz_title, quiz_questions, assignment_data):
            mod = Module(
                tenant_id=tenant.id,
                course_id=course_id,
                title=title,
                description=description,
                section_title=section_title,
                order_index=order_index,
            )
            db.add(mod)
            db.flush()

            for idx, (ltitle, lcontent, lvideo, lreading, ldownload) in enumerate(lessons_data):
                lesson = Lesson(
                    tenant_id=tenant.id,
                    module_id=mod.id,
                    title=ltitle,
                    content_text=lcontent,
                    video_url=lvideo,
                    subtitle_url="",
                    reading_materials_json=lreading,
                    downloadable_resources_json=ldownload,
                    order_index=idx,
                )
                db.add(lesson)

            assessment = Assessment(
                tenant_id=tenant.id,
                module_id=mod.id,
                title=quiz_title,
                assessment_type="quiz",
                passing_score=70,
                time_limit_minutes=20,
                marks_per_question=1,
            )
            db.add(assessment)
            db.flush()

            for q_text, q_opts, q_correct in quiz_questions:
                q = AssessmentQuestion(
                    tenant_id=tenant.id,
                    assessment_id=assessment.id,
                    question_text=q_text,
                    question_type="mcq",
                    options_json=q_opts,
                    correct_answer_index=q_correct,
                    marks=1,
                )
                db.add(q)

            a_title, a_desc, a_guide = assignment_data
            assignment = Assignment(
                tenant_id=tenant.id,
                module_id=mod.id,
                title=a_title,
                description=a_desc,
                guidelines=a_guide,
                deadline=None,
            )
            db.add(assignment)

        # ── Module 1: Introduction to HR Management ───────────────────
        _add_hr_module(
            course_id=hr_course.id,
            title="Introduction to HR Management",
            description="Understand the strategic role of Human Resources, the employee lifecycle from hire to retire, and how HR policies create a structured and compliant workplace.",
            section_title="Week 1",
            order_index=0,
            lessons_data=[
                (
                    "Role of HR in an Organisation",
                    "Human Resources (HR) is the backbone of every organisation. The HR function is responsible for "
                    "attracting, developing, and retaining talent while ensuring the organisation complies with applicable "
                    "laws and operates ethically. Core HR functions include: Talent Acquisition (recruitment and selection), "
                    "Learning & Development (training and upskilling), Compensation & Benefits (payroll, incentives), "
                    "Employee Relations (conflict resolution, grievances), and HR Compliance (legal adherence, audits). "
                    "Strategic HR goes beyond administrative tasks — it aligns people strategy with business goals, "
                    "contributes to culture building, and supports leadership in workforce planning. "
                    "For managers, understanding HR's role means knowing when and how to partner with HR for hiring decisions, "
                    "disciplinary actions, appraisals, and policy enforcement. HR is not just a support function; "
                    "it is a strategic partner in organizational success.",
                    "https://www.youtube.com/results?search_query=role+of+HR+in+an+organisation+explained",
                    [
                        {"label": "Article: What Does HR Actually Do? 11 Key Responsibilities", "url": "https://www.shrm.org/resourcesandtools/hr-topics/organizational-and-employee-development/pages/what-is-human-resources.aspx"},
                        {"label": "Video: HR Management Introduction (YouTube Search)", "url": "https://www.youtube.com/results?search_query=introduction+to+human+resource+management"},
                    ],
                    [
                        {"label": "HR Role Overview Template (Download)", "url": "https://www.shrm.org/resourcesandtools/tools-and-samples/job-descriptions/pages/humanresourcesdirector.aspx"},
                    ],
                ),
                (
                    "Employee Lifecycle: Hire to Retire",
                    "The employee lifecycle describes the journey of an employee from the moment they are recruited "
                    "to the time they leave the organisation. Understanding each stage helps managers provide the right "
                    "support at the right time. The six stages are:\n\n"
                    "1. Attract — employer branding, job postings, talent pipelines.\n"
                    "2. Recruit — sourcing, screening, interviewing, and selection.\n"
                    "3. Onboard — orientation, induction, role training, buddy assignment.\n"
                    "4. Develop — learning plans, performance feedback, promotions, cross-training.\n"
                    "5. Retain — recognition, engagement surveys, career development, compensation reviews.\n"
                    "6. Separate — resignation/termination procedures, exit interviews, full and final settlement.\n\n"
                    "Each stage has compliance requirements — from background checks during recruitment to proper "
                    "documentation during exit. Managers play a critical role at every stage: they approve hires, "
                    "conduct appraisals, address grievances, and initiate separations. A well-managed lifecycle reduces "
                    "attrition, improves engagement, and ensures legal protection for the organisation.",
                    "https://www.youtube.com/results?search_query=employee+lifecycle+management+HR",
                    [
                        {"label": "Article: The 6 Stages of the Employee Lifecycle", "url": "https://blog.hrm.io/employee-lifecycle/"},
                        {"label": "Video: Employee Lifecycle Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=employee+lifecycle+stages+HR+management"},
                    ],
                    [
                        {"label": "Employee Lifecycle Checklist Template", "url": "https://www.shrm.org/resourcesandtools/tools-and-samples/checklists/pages/newemployeeonboardingguide.aspx"},
                    ],
                ),
                (
                    "HR Policies: Purpose, Types, and Compliance",
                    "HR policies are formal, documented guidelines that govern how an organisation manages its people "
                    "and responds to workplace situations. They create consistency, fairness, and legal protection. "
                    "Key types of HR policies include:\n\n"
                    "• Recruitment Policy — guidelines for fair and non-discriminatory hiring.\n"
                    "• Leave & Attendance Policy — leave types (casual, sick, earned), approval processes.\n"
                    "• Code of Conduct — expected behaviours, disciplinary procedures.\n"
                    "• Anti-Harassment Policy — zero tolerance for any form of harassment (POSH Act compliance).\n"
                    "• Grievance Redressal Policy — structured mechanism for employees to raise concerns.\n"
                    "• Data Privacy Policy — handling of employee personal data (compliant with IT Act).\n"
                    "• Separation Policy — resignation notice, relieving letters, FnF settlement.\n\n"
                    "All managers must read, understand, and follow HR policies. They are also responsible for ensuring "
                    "their team members are aware of and comply with these policies. Policy violations must be reported "
                    "to HR immediately. Policies must be reviewed annually and updated to reflect legal and organisational changes.",
                    "https://www.youtube.com/results?search_query=HR+policies+and+procedures+overview",
                    [
                        {"label": "Article: Types of HR Policies Every Organisation Needs", "url": "https://resources.workable.com/hr-policies"},
                        {"label": "Video: HR Policies Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=hr+policies+and+procedures+explained"},
                    ],
                    [
                        {"label": "HR Policy Handbook Template (Download)", "url": "https://resources.workable.com/employee-handbook-company-policies"},
                        {"label": "Leave Policy Template (Download)", "url": "https://resources.workable.com/leave-of-absence-company-policy"},
                    ],
                ),
            ],
            quiz_title="Module 1 Quiz — HR Management Fundamentals",
            quiz_questions=[
                (
                    "A new employee reports feeling excluded and unsupported during their first week. As their manager, what is the most appropriate first action?",
                    {"a": "Ask HR to handle it — it is their job, not yours", "b": "Schedule a one-on-one meeting, listen to their concerns, and connect them with a buddy or mentor", "c": "Tell the employee to give it more time and not overreact", "d": "Escalate immediately to senior leadership"},
                    1,
                ),
                (
                    "Which of the following is NOT a core function of Human Resources?",
                    {"a": "Talent acquisition and recruitment", "b": "Managing product development timelines", "c": "Learning and development programmes", "d": "Employee relations and grievance handling"},
                    1,
                ),
                (
                    "An employee has been with the company for 3 years and is considering leaving due to lack of growth. Which lifecycle stage is this, and what should the manager do?",
                    {"a": "Attract stage — post a new job ad to replace them", "b": "Retain stage — have a career development conversation and explore growth opportunities", "c": "Separate stage — begin the exit formalities immediately", "d": "Recruit stage — this is not the manager's responsibility"},
                    1,
                ),
                (
                    "Which HR policy specifically governs employee behaviour, workplace ethics, and disciplinary procedures?",
                    {"a": "Recruitment Policy", "b": "Separation Policy", "c": "Code of Conduct Policy", "d": "Data Privacy Policy"},
                    2,
                ),
                (
                    "HR policies must be reviewed and updated:",
                    {"a": "Only when a legal dispute arises", "b": "Every 10 years to maintain stability", "c": "Annually or when legal or organisational changes occur", "d": "Only when the CEO approves a review request"},
                    2,
                ),
            ],
            assignment_data=(
                "Case Study: Rebuilding HR Structures at TechStart India",
                "Case Study: TechStart India is a 3-year-old IT startup with 120 employees. The company has grown "
                "rapidly but has no formal HR policies, no documented employee lifecycle process, and no code of conduct. "
                "Recently, three employees resigned citing confusion about leave policies, while one employee filed an "
                "informal complaint about inappropriate behaviour that was never addressed.\n\n"
                "As the newly appointed HR Manager, you have been asked to:\n"
                "1. Identify the top 3 HR functions that TechStart needs to implement immediately and explain why.\n"
                "2. Draft a brief Employee Lifecycle roadmap (hire to retain stage) for TechStart, noting what should "
                "happen at each stage.\n"
                "3. List 4 essential HR policies TechStart must create, and explain the compliance risk of not having each one.",
                "Write a structured report (400–600 words). Use headings for each of the 3 tasks. "
                "Support your recommendations with compliance risks and real-world examples where possible. "
                "Reference applicable Indian laws (e.g., the POSH Act for harassment, Factories Act, Shops & Establishments Act) "
                "where relevant. Submit as a PDF or Word document.",
            ),
        )

        # ── Module 2: Workplace Ethics & Code of Conduct ──────────────
        _add_hr_module(
            course_id=hr_course.id,
            title="Workplace Ethics & Code of Conduct",
            description="Explore the principles of ethical behaviour at work, the importance of company policies, and how to identify and address harassment and discrimination in compliance with the POSH Act.",
            section_title="Week 2",
            order_index=1,
            lessons_data=[
                (
                    "Ethical Behaviour in the Workplace",
                    "Workplace ethics refers to the set of moral principles and values that guide individual and "
                    "organisational behaviour at work. Ethical behaviour builds trust, improves team cohesion, and "
                    "protects the organisation from legal liability. Core ethical principles include:\n\n"
                    "• Integrity — acting honestly and transparently in all dealings.\n"
                    "• Accountability — taking ownership of one's actions and their consequences.\n"
                    "• Fairness — treating all employees consistently and without bias.\n"
                    "• Respect — valuing colleagues regardless of role, background, or opinion.\n"
                    "• Confidentiality — protecting sensitive business and employee data.\n\n"
                    "Common ethical violations include: accepting kickbacks or bribes, sharing confidential information, "
                    "misrepresenting work output, taking credit for others' work, and discriminatory behaviour. "
                    "Managers set the ethical tone for their team. Unethical behaviour by a manager — even if "
                    "unintentional — sends a damaging message to the team. Leaders must model the values they expect, "
                    "address ethical breaches immediately, and create psychological safety for employees to report concerns "
                    "without fear of retaliation.",
                    "https://www.youtube.com/results?search_query=workplace+ethics+and+integrity+training",
                    [
                        {"label": "Article: Workplace Ethics — Definition, Importance, and Examples", "url": "https://www.indeed.com/career-advice/career-development/workplace-ethics"},
                        {"label": "Video: Workplace Ethics Training (YouTube Search)", "url": "https://www.youtube.com/results?search_query=workplace+ethics+training+for+employees"},
                    ],
                    [
                        {"label": "Workplace Ethics Code of Conduct Template", "url": "https://resources.workable.com/code-of-conduct-company-policy"},
                    ],
                ),
                (
                    "Company Policies and Disciplinary Procedures",
                    "Company policies are formal, documented rules that define acceptable behaviour, set expectations, "
                    "and establish consequences for non-compliance. A strong policy framework protects both the employee "
                    "and the organisation. Key policies every manager must know:\n\n"
                    "• Attendance & Punctuality Policy — defines working hours, late arrivals, and absenteeism procedures.\n"
                    "• Social Media Policy — governs employee use of social platforms regarding company information.\n"
                    "• IT & Acceptable Use Policy — rules around company devices, internet use, and data security.\n"
                    "• Conflict of Interest Policy — disclosure requirements for personal interests that may affect work.\n"
                    "• Disciplinary Policy — the step-by-step process for addressing misconduct: verbal warning, "
                    "written warning, suspension, termination.\n\n"
                    "Disciplinary procedures must be consistent, documented, and fair. Before taking any disciplinary "
                    "action, managers must consult HR. All verbal warnings should be followed by written documentation. "
                    "Wrongful termination or inconsistent application of policies can lead to legal claims. "
                    "Always follow the natural justice principle: give the employee an opportunity to be heard.",
                    "https://www.youtube.com/results?search_query=company+disciplinary+procedures+HR",
                    [
                        {"label": "Article: Disciplinary Procedures in the Workplace", "url": "https://resources.workable.com/disciplinary-action-policy-company-policy"},
                        {"label": "Video: Disciplinary Policy and Procedures (YouTube Search)", "url": "https://www.youtube.com/results?search_query=disciplinary+procedures+workplace+HR+policy"},
                    ],
                    [
                        {"label": "Disciplinary Action Policy Template", "url": "https://resources.workable.com/disciplinary-action-policy-company-policy"},
                        {"label": "Employee Warning Letter Template", "url": "https://resources.workable.com/employee-warning-letter-sample"},
                    ],
                ),
                (
                    "Anti-Harassment Guidelines and the POSH Act (India)",
                    "Workplace harassment is any unwanted conduct that creates a hostile, intimidating, or offensive "
                    "work environment. In India, the Prevention of Sexual Harassment (POSH) Act, 2013, mandates that "
                    "every organisation with 10 or more employees must:\n\n"
                    "• Constitute an Internal Complaints Committee (ICC).\n"
                    "• Display anti-sexual harassment policy and ICC details at the workplace.\n"
                    "• Conduct annual POSH awareness training for all employees.\n"
                    "• Submit an annual compliance report to the district officer.\n\n"
                    "Types of harassment covered: Sexual harassment (verbal, physical, visual), workplace bullying, "
                    "discrimination based on gender, caste, religion, or disability. "
                    "As a manager, your responsibilities include:\n"
                    "1. Never ignore or trivialise a complaint — take it seriously and refer to ICC immediately.\n"
                    "2. Maintain confidentiality — do not discuss the matter with the broader team.\n"
                    "3. Do not retaliate against the complainant in any form.\n"
                    "4. Participate in annual POSH training and ensure your team does too.\n"
                    "Non-compliance with the POSH Act can result in monetary penalties and criminal liability for the employer.",
                    "https://www.youtube.com/results?search_query=POSH+Act+India+workplace+harassment+training",
                    [
                        {"label": "Article: POSH Act 2013 — Complete Guide for Employers", "url": "https://www.nishithdesai.com/fileadmin/user_upload/pdfs/Research%20Papers/Prevention-of-Sexual-Harassment-at-Workplace.pdf"},
                        {"label": "Video: POSH Act India Training (YouTube Search)", "url": "https://www.youtube.com/results?search_query=POSH+Act+India+sexual+harassment+prevention+training"},
                    ],
                    [
                        {"label": "POSH Policy Template for Indian Organisations", "url": "https://resources.workable.com/workplace-harassment-policy"},
                        {"label": "ICC Constitution Guidelines (India)", "url": "https://www.nishithdesai.com/fileadmin/user_upload/pdfs/Research%20Papers/Prevention-of-Sexual-Harassment-at-Workplace.pdf"},
                    ],
                ),
            ],
            quiz_title="Module 2 Quiz — Workplace Ethics & Code of Conduct",
            quiz_questions=[
                (
                    "A team member tells you privately that a senior colleague made an inappropriate comment toward her. She is afraid to file a formal complaint. What should you do?",
                    {"a": "Ask her to ignore it since it was probably just a joke", "b": "Confront the senior colleague publicly in the next team meeting", "c": "Explain the POSH complaint process, assure confidentiality, and connect her with the ICC", "d": "Tell her to handle it herself to avoid escalating"},
                    2,
                ),
                (
                    "According to the POSH Act 2013, which of the following is a mandatory requirement for organisations with 10+ employees in India?",
                    {"a": "Having at least 30% women in leadership roles", "b": "Constituting an Internal Complaints Committee (ICC)", "c": "Providing free legal aid to all employees", "d": "Conducting weekly team bonding sessions"},
                    1,
                ),
                (
                    "An employee has been found to have shared confidential business data on a personal social media account. Which policy is most directly violated?",
                    {"a": "Leave and Attendance Policy", "b": "Social Media and IT Acceptable Use Policy", "c": "Compensation Policy", "d": "Recruitment Policy"},
                    1,
                ),
                (
                    "What is the first step a manager should take when a team member's performance or behaviour violates company policy?",
                    {"a": "Immediately terminate the employee to protect the team", "b": "Give a verbal warning first, document it, and escalate only if the behaviour continues", "c": "Ignore it the first time to give the employee the benefit of the doubt", "d": "Send an anonymous complaint to the HR inbox"},
                    1,
                ),
                (
                    "Which principle requires giving an employee the opportunity to present their side before disciplinary action is taken?",
                    {"a": "Principle of immediacy", "b": "Principle of natural justice", "c": "Principle of proportionality", "d": "Principle of implied consent"},
                    1,
                ),
            ],
            assignment_data=(
                "Case Study: The Silent Complaint at Meridian Solutions",
                "Case Study: Meridian Solutions employs 85 people across offices in Mumbai and Pune. Priya, a junior "
                "marketing executive, approaches you (her manager) and describes two incidents where a senior sales manager "
                "made comments about her appearance in front of colleagues. She says she is uncomfortable but scared that "
                "filing a formal complaint will affect her appraisal and team dynamics. Meanwhile, you observe that another "
                "team member has been repeatedly sharing competitor strategy data on his personal WhatsApp groups.\n\n"
                "Your assignment:\n"
                "1. Describe the exact steps you would take to address Priya's concern, ensuring POSH Act compliance. "
                "Include what you would say to Priya and how you would document the interaction.\n"
                "2. Identify which company policies the second employee has violated and outline the disciplinary process "
                "you would follow, citing natural justice principles.\n"
                "3. Propose a team-level preventive measure (training, communication, or process) you would implement "
                "to prevent recurrence of both issues.",
                "Format your response as a structured case analysis (3 sections, 150–200 words each). "
                "Reference the POSH Act 2013 and applicable company policies in your response. "
                "Be specific — avoid generic answers. Your response will be evaluated on accuracy, empathy, and compliance.",
            ),
        )

        # ── Module 3: Labor Laws & Legal Compliance (India Focus) ─────
        _add_hr_module(
            course_id=hr_course.id,
            title="Labor Laws & Legal Compliance (India Focus)",
            description="Understand the key Indian labor laws that every manager must know, employee rights under Indian legislation, and employer obligations to avoid legal penalties.",
            section_title="Week 3",
            order_index=2,
            lessons_data=[
                (
                    "Key Indian Labor Laws Every Manager Must Know",
                    "India has one of the most comprehensive labor law frameworks in the world. While the government "
                    "has consolidated several acts into 4 Labor Codes (recently enacted), managers must understand both "
                    "the legacy acts and the new codes. Key legislation includes:\n\n"
                    "• The Factories Act, 1948 — regulates working conditions, health and safety in factories; "
                    "limits working hours to 48 per week (9 hours/day), mandates overtime pay at 2x rate.\n"
                    "• The Shops and Establishments Act (State-specific) — governs hours, holidays, and working conditions "
                    "for commercial establishments.\n"
                    "• The Payment of Wages Act, 1936 — ensures timely payment of wages without unauthorized deductions.\n"
                    "• The Minimum Wages Act, 1948 — sets minimum wage floors (state and central levels).\n"
                    "• The Employees' Provident Funds Act, 1952 (EPF) — mandates 12% employer contribution to PF for "
                    "organisations with 20+ employees.\n"
                    "• The Employees' State Insurance Act, 1948 (ESI) — provides medical benefits for employees earning "
                    "below ₹21,000/month.\n"
                    "• The Maternity Benefit Act, 1961 (amended 2017) — grants 26 weeks paid maternity leave for "
                    "organisations with 10+ employees.\n"
                    "• The Gratuity Act, 1972 — mandates gratuity payment after 5 years of service: 15 days salary × years of service.\n\n"
                    "Non-compliance with any of these acts can result in penalties, inspections, and criminal liability.",
                    "https://www.youtube.com/results?search_query=Indian+labor+laws+overview+HR+compliance",
                    [
                        {"label": "Article: Overview of Indian Labor Laws", "url": "https://www.nishithdesai.com/fileadmin/user_upload/pdfs/Research%20Papers/Employment_and_Labour_Law.pdf"},
                        {"label": "Video: Indian Labor Laws Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=Indian+labour+laws+explained+for+HR"},
                    ],
                    [
                        {"label": "Indian Labor Law Compliance Checklist", "url": "https://www.shrm.org/resourcesandtools/tools-and-samples/checklists/pages/hrauditchecklist.aspx"},
                    ],
                ),
                (
                    "Employee Rights Under Indian Law",
                    "Every employee in India has fundamental rights protected by law. Managers who are unaware of these "
                    "rights risk exposing their organisation to legal action. Key employee rights include:\n\n"
                    "• Right to Fair Wages — employees must be paid at or above the applicable minimum wage on time, "
                    "without unauthorized deductions (Payment of Wages Act, 1936).\n"
                    "• Right to Safe Working Conditions — employers must provide a safe, healthy, and hazard-free "
                    "workplace (Factories Act, Occupational Safety Health and Working Conditions Code, 2020).\n"
                    "• Right to Maternity Leave — women employees are entitled to 26 weeks of paid maternity leave "
                    "(Maternity Benefit Act, 1961, amended 2017).\n"
                    "• Right to PF and ESI Benefits — employees have the right to social security contributions "
                    "made on their behalf.\n"
                    "• Right Against Wrongful Termination — employees cannot be terminated without notice (as per "
                    "appointment letter and Standing Orders), and termination must follow due process.\n"
                    "• Right to Grievance Redressal — every employee has the right to raise workplace concerns "
                    "through formal channels without fear of retaliation.\n"
                    "• Right Against Discrimination — no employee can be discriminated against based on gender, "
                    "caste, religion, disability, or pregnancy under multiple acts and the Constitution.",
                    "https://www.youtube.com/results?search_query=employee+rights+India+labor+law",
                    [
                        {"label": "Article: Employee Rights Under Indian Law — A Complete Guide", "url": "https://legalserviceindia.com/legal/article-3127-rights-of-employees-in-india.html"},
                        {"label": "Video: Employee Rights India (YouTube Search)", "url": "https://www.youtube.com/results?search_query=employee+rights+under+indian+labour+law"},
                    ],
                    [
                        {"label": "Employee Rights Summary — India (PDF Reference)", "url": "https://labour.gov.in/whatsnew/report-working-group-labour-laws"},
                    ],
                ),
                (
                    "Employer Responsibilities and Legal Obligations",
                    "Compliance is not optional — it is a legal and ethical obligation. As a manager, you represent the "
                    "employer and may be held personally liable for compliance failures within your team. Key employer "
                    "responsibilities include:\n\n"
                    "• Statutory Compliance — file EPF, ESI, professional tax, and TDS returns on time. "
                    "Ensure all statutory registers are maintained (attendance register, wages register, leave register).\n"
                    "• Appointment Letters — every new employee must receive a written appointment letter with job title, "
                    "salary, working hours, notice period, and applicable policies.\n"
                    "• Working Hours Compliance — monitor overtime, ensure employees are not made to work beyond "
                    "legal limits without compensation.\n"
                    "• POSH Compliance — constitute ICC, conduct annual training, submit annual compliance report.\n"
                    "• Leave Entitlements — correctly calculate and grant earned leave, casual leave, and sick leave "
                    "as per the Shops & Establishments Act.\n"
                    "• Exit Formalities — issue relieving letters, experience certificates, and complete Full & Final "
                    "Settlement within the stipulated time (typically 45–60 days).\n"
                    "• Whistleblower Protection — do not retaliate against employees who report compliance issues "
                    "internally or to government authorities.\n\n"
                    "Annual HR audits should be conducted to verify compliance across all these areas. "
                    "Non-compliant companies can face penalties, inspections, and reputational damage.",
                    "https://www.youtube.com/results?search_query=employer+responsibilities+India+HR+compliance",
                    [
                        {"label": "Article: HR Compliance Checklist for Indian Employers", "url": "https://resources.workable.com/hr-compliance-checklist"},
                        {"label": "Video: Statutory Compliance India (YouTube Search)", "url": "https://www.youtube.com/results?search_query=statutory+compliance+India+HR+EPF+ESI"},
                    ],
                    [
                        {"label": "Statutory Compliance Register Template (India)", "url": "https://www.shrm.org/resourcesandtools/tools-and-samples/checklists/pages/hrauditchecklist.aspx"},
                        {"label": "Appointment Letter Template (India Standard)", "url": "https://resources.workable.com/offer-letter-template"},
                    ],
                ),
            ],
            quiz_title="Module 3 Quiz — Labor Laws & Legal Compliance",
            quiz_questions=[
                (
                    "Under the Factories Act, 1948, what is the maximum number of working hours per week an adult employee can be required to work?",
                    {"a": "40 hours", "b": "44 hours", "c": "48 hours", "d": "60 hours"},
                    2,
                ),
                (
                    "An employee earning ₹18,000/month becomes pregnant. Under the Maternity Benefit Act 2017, she is entitled to how many weeks of paid leave?",
                    {"a": "12 weeks", "b": "16 weeks", "c": "20 weeks", "d": "26 weeks"},
                    3,
                ),
                (
                    "An employee is dismissed without receiving a written warning, show cause notice, or a chance to explain their side. What principle has been violated?",
                    {"a": "Principle of proportionality", "b": "Principle of natural justice", "c": "Principle of due diligence", "d": "Principle of implied consent"},
                    1,
                ),
                (
                    "Which of the following is an employer's mandatory statutory obligation for organisations with 20 or more employees?",
                    {"a": "Providing free canteen facilities", "b": "Enrolling employees in the Employees' Provident Fund (EPF) scheme", "c": "Giving employees an annual bonus of 20% of salary", "d": "Providing transport allowance for all employees"},
                    1,
                ),
                (
                    "What should be included in every new employee's appointment letter?",
                    {"a": "Only salary and start date", "b": "Salary, working hours, notice period, job title, and applicable policies", "c": "Just the job description and office address", "d": "Performance targets for the first quarter"},
                    1,
                ),
            ],
            assignment_data=(
                "Case Study: Compliance Audit at GlobalTech Services",
                "Case Study: GlobalTech Services has 250 employees across Bengaluru and Hyderabad. During an internal "
                "HR audit, the following issues were discovered:\n"
                "• 30 employees have been working 55–60 hours per week without overtime pay for the last 6 months.\n"
                "• Two female employees requested maternity leave but were told by their managers to 'manage it themselves' "
                "as it was 'not the right time'.\n"
                "• EPF contributions for 15 contract employees have not been filed for the past 3 months.\n"
                "• No ICC has been constituted despite the organisation employing over 50 women.\n\n"
                "Your tasks:\n"
                "1. For each of the 4 compliance violations above, identify the specific law or act being violated and "
                "state the potential legal consequence for the employer.\n"
                "2. Recommend 3 immediate corrective actions and 2 preventive measures GlobalTech should implement.\n"
                "3. Draft a brief memo (100 words) from HR to all managers reminding them of their legal obligations "
                "regarding overtime and maternity leave.",
                "Format as a structured report with 3 sections. Include law references (act name + section). "
                "Penalties and legal consequences should be specific (e.g., fine amount, imprisonment term). "
                "Your memo must be professional, concise, and actionable. Submit as a PDF document.",
            ),
        )

        # ── Module 4: Hiring, Onboarding & Documentation ──────────────
        _add_hr_module(
            course_id=hr_course.id,
            title="Hiring, Onboarding & Documentation",
            description="Learn how to run a structured, legally compliant recruitment process, conduct fair interviews, and maintain proper employee documentation from offer letter to exit.",
            section_title="Week 4",
            order_index=3,
            lessons_data=[
                (
                    "Recruitment Process and Best Practices",
                    "Recruitment is the process of identifying, attracting, and selecting the best candidates for "
                    "open positions in the organisation. A structured, compliant recruitment process ensures fairness, "
                    "reduces bias, and protects the organisation from discrimination claims. The end-to-end recruitment "
                    "process typically follows these steps:\n\n"
                    "1. Job Analysis & JD Preparation — define the role, required skills, experience, and reporting structure.\n"
                    "2. Approval & Manpower Requisition — obtain formal approval from HR and Finance before posting.\n"
                    "3. Sourcing — job portals (Naukri, LinkedIn, Indeed), internal referrals, campus recruitment, agencies.\n"
                    "4. Screening & Shortlisting — review applications against JD criteria; use structured shortlisting matrices.\n"
                    "5. Assessment & Interviews — technical tests, HR interview, manager interview, final round.\n"
                    "6. Background Verification — employment history, educational credentials, criminal record (where applicable).\n"
                    "7. Offer Rollout — issue formal offer letter with all terms clearly stated.\n"
                    "8. Pre-joining Formalities — collect documents, set up IT access, prepare induction plan.\n\n"
                    "Compliance considerations: Ensure job descriptions do not contain discriminatory language "
                    "(e.g., 'young candidates only', 'male preferred'). All interview decisions must be documented. "
                    "Rejections should be based on objective criteria.",
                    "https://www.youtube.com/results?search_query=HR+recruitment+process+best+practices",
                    [
                        {"label": "Article: The End-to-End Recruitment Process", "url": "https://resources.workable.com/hr-recruiting-process"},
                        {"label": "Video: Recruitment Process Explained (YouTube Search)", "url": "https://www.youtube.com/results?search_query=recruitment+process+HR+step+by+step"},
                    ],
                    [
                        {"label": "Job Description Template (Standard HR Format)", "url": "https://resources.workable.com/job-description-templates/"},
                        {"label": "Interview Evaluation Scorecard Template", "url": "https://resources.workable.com/interview-scorecard-template"},
                    ],
                ),
                (
                    "Interview Guidelines and Compliance",
                    "Conducting a legally compliant and unbiased interview is one of the most critical skills for any "
                    "manager involved in hiring. Key interview guidelines:\n\n"
                    "DO ask:\n"
                    "• 'Can you describe a time you managed a difficult stakeholder situation?'\n"
                    "• 'What is your experience with project management tools?'\n"
                    "• 'How do you prioritise tasks under competing deadlines?'\n"
                    "• Competency and skill-based questions aligned with the job requirements.\n\n"
                    "DO NOT ask (illegal / discriminatory):\n"
                    "• 'Are you married or do you plan to have children?' (gender discrimination)\n"
                    "• 'What is your religion or caste?' (religious/caste discrimination)\n"
                    "• 'How old are you exactly?' (age discrimination — unless directly relevant)\n"
                    "• 'Do you have any health conditions?' (disability discrimination)\n\n"
                    "Interview Best Practices:\n"
                    "• Use a structured interview format with standardised questions for all candidates.\n"
                    "• Use an Interview Evaluation Scorecard to document scores objectively.\n"
                    "• Conduct panel interviews to reduce individual bias.\n"
                    "• Provide a consistent candidate experience — acknowledge receipt, communicate timelines.\n"
                    "• Store interview notes securely — they may be needed as evidence in legal disputes.\n\n"
                    "All hiring decisions must be based solely on merit, qualifications, and job relevance.",
                    "https://www.youtube.com/results?search_query=structured+interview+techniques+HR+compliance",
                    [
                        {"label": "Article: Interview Questions — Legal vs Illegal", "url": "https://resources.workable.com/interview-question-types/illegal-interview-questions"},
                        {"label": "Video: Structured Interview Techniques (YouTube Search)", "url": "https://www.youtube.com/results?search_query=structured+interview+questions+compliance+HR"},
                    ],
                    [
                        {"label": "Interview Question Bank — HR & Compliance Roles", "url": "https://resources.workable.com/interview-questions/"},
                        {"label": "Candidate Feedback Form Template", "url": "https://resources.workable.com/candidate-feedback-form-template"},
                    ],
                ),
                (
                    "Employee Documentation and Compliance Records",
                    "Maintaining accurate, complete, and secure employee documentation is both a legal requirement and a "
                    "risk management tool. Key documents that every organisation must maintain:\n\n"
                    "Pre-joining Documents:\n"
                    "• Educational and experience certificates (verified copies)\n"
                    "• Identity proof (Aadhaar, PAN, Passport)\n"
                    "• Address proof\n"
                    "• Previous employment relieving letter\n"
                    "• Bank account details for salary credit\n\n"
                    "Joining Documents:\n"
                    "• Signed appointment letter\n"
                    "• Employee Information Form\n"
                    "• EPF / ESI nomination form\n"
                    "• Signed NDA / confidentiality agreement\n"
                    "• Signed Code of Conduct and POSH policy acknowledgement\n\n"
                    "Ongoing Documentation:\n"
                    "• Leave records and attendance registers\n"
                    "• Performance appraisal records\n"
                    "• Salary slips (mandatory to provide monthly)\n"
                    "• Disciplinary action records (warnings, suspension orders)\n"
                    "• Training completion records\n\n"
                    "Exit Documents:\n"
                    "• Resignation letter (with acceptance)\n"
                    "• Clearance certificate from all departments\n"
                    "• Relieving letter and experience certificate\n"
                    "• Full & Final Settlement (FnF) statement\n"
                    "• Form 16 for tax purposes\n\n"
                    "All documents must be stored securely, with restricted access, for a minimum of 5–8 years "
                    "(as required by applicable laws). Digital HR systems should enforce role-based access controls.",
                    "https://www.youtube.com/results?search_query=employee+documentation+HR+compliance+India",
                    [
                        {"label": "Article: Employee Documentation Checklist for HR", "url": "https://resources.workable.com/hr-onboarding-checklist"},
                        {"label": "Video: Employee Documents Required in India (YouTube Search)", "url": "https://www.youtube.com/results?search_query=employee+documentation+required+India+HR"},
                    ],
                    [
                        {"label": "Employee Onboarding Checklist Template (Download)", "url": "https://resources.workable.com/hr-onboarding-checklist"},
                        {"label": "New Hire Documentation Folder Checklist", "url": "https://resources.workable.com/new-employee-checklist"},
                    ],
                ),
            ],
            quiz_title="Module 4 Quiz — Hiring, Onboarding & Documentation",
            quiz_questions=[
                (
                    "During a job interview, a candidate mentions she is expecting a baby in 4 months. The panel decides not to select her based on this. This is an example of:",
                    {"a": "A valid business decision based on operational needs", "b": "Discrimination under the Maternity Benefit Act and equal opportunity principles", "c": "Appropriate workforce planning by the management team", "d": "A legal decision if properly documented"},
                    1,
                ),
                (
                    "Which document is mandatory at the time of joining and must be signed by every new employee?",
                    {"a": "Resignation letter template for future reference", "b": "Signed appointment letter with all terms and conditions", "c": "IT equipment inventory list", "d": "Detailed performance targets for Year 3"},
                    1,
                ),
                (
                    "Background verification for a new hire should include verification of:",
                    {"a": "Political affiliations and social media opinions", "b": "Employment history, educational credentials, and identity documents", "c": "Credit score and financial liabilities", "d": "Marital status and family background"},
                    1,
                ),
                (
                    "An interviewer asks all male candidates technical questions but asks female candidates only about cultural fit. This practice:",
                    {"a": "Is acceptable as long as the final decision is merit-based", "b": "Is a form of gender bias and violates fair hiring principles", "c": "Is standard HR best practice for diverse teams", "d": "Is required by law for equal opportunity hiring"},
                    1,
                ),
                (
                    "Employee documentation must generally be retained for a minimum of how many years after exit?",
                    {"a": "1 year", "b": "2 years", "c": "5–8 years as required by applicable laws", "d": "Only until the Full & Final Settlement is completed"},
                    2,
                ),
            ],
            assignment_data=(
                "Case Study: The Flawed Hiring Process at Nova Retail",
                "Case Study: Nova Retail is expanding and needs to hire 15 store managers across India. "
                "The hiring manager, Vikram, has been running the recruitment process informally:\n"
                "• Job postings contain phrases like 'energetic young candidates preferred' and 'male candidates for field roles'.\n"
                "• Interviews are unstructured — each interviewer asks different questions based on personal preference.\n"
                "• Two female candidates were shortlisted but later rejected after the panel learned they were recently married.\n"
                "• No background verification was conducted for the final 5 hires.\n"
                "• New joiners received no appointment letter — just a verbal confirmation of their salary.\n\n"
                "Your tasks:\n"
                "1. Identify 5 specific compliance violations in Vikram's hiring process. For each, state which "
                "law/policy is violated and the potential consequence.\n"
                "2. Redesign a structured 6-step recruitment process for Nova Retail that addresses all identified violations.\n"
                "3. Create a 5-question structured interview scorecard for the Store Manager role that uses "
                "competency-based questions and avoids all discriminatory elements.",
                "Format as a 3-part report (400–600 words total). Include a table or matrix for the scorecard. "
                "Reference applicable Indian laws and best practices. Show that you understand both the legal and "
                "practical dimensions of compliant recruitment. Submit as a Word document or PDF.",
            ),
        )

        # ── Module 5: Performance Management & Employee Relations ─────
        _add_hr_module(
            course_id=hr_course.id,
            title="Performance Management & Employee Relations",
            description="Learn how to conduct fair and effective performance appraisals, build robust feedback systems, and manage workplace conflict and employee grievances professionally.",
            section_title="Week 5",
            order_index=4,
            lessons_data=[
                (
                    "Performance Appraisals: Process and Best Practices",
                    "Performance management is the ongoing process of communicating expectations, monitoring progress, "
                    "providing feedback, and evaluating outcomes. Effective appraisals drive engagement, accountability, "
                    "and development. Most organisations use one of these appraisal models:\n\n"
                    "• Annual/Semi-Annual Appraisal — formal review at fixed intervals with ratings and salary decisions.\n"
                    "• 360-Degree Feedback — assessment from manager, peers, subordinates, and the employee themselves.\n"
                    "• OKR-Based Review — performance assessed against predefined Objectives and Key Results.\n"
                    "• Continuous Performance Management — ongoing check-ins replacing annual reviews.\n\n"
                    "Key best practices for managers:\n"
                    "1. Set SMART goals at the beginning of the review period (Specific, Measurable, Achievable, Relevant, Time-bound).\n"
                    "2. Document performance evidence throughout the year — do not rely on memory at appraisal time.\n"
                    "3. Avoid rating biases: halo effect (overrating high performers), horns effect (underrating based on one incident), "
                    "recency bias (judging based only on recent performance).\n"
                    "4. Ensure the appraisal is a two-way conversation — allow the employee to self-assess.\n"
                    "5. Link appraisal outcomes to development plans, not just compensation.\n\n"
                    "Appraisals must be documented. A manager who does not follow the appraisal process fairly and consistently "
                    "may face grievances from employees claiming bias or unfair treatment.",
                    "https://www.youtube.com/results?search_query=performance+appraisal+process+HR+best+practices",
                    [
                        {"label": "Article: How to Conduct Effective Performance Appraisals", "url": "https://resources.workable.com/performance-review-process"},
                        {"label": "Video: Performance Appraisal Process (YouTube Search)", "url": "https://www.youtube.com/results?search_query=performance+appraisal+best+practices+HR"},
                    ],
                    [
                        {"label": "Performance Review Form Template (Download)", "url": "https://resources.workable.com/performance-review-template"},
                        {"label": "SMART Goal Setting Template", "url": "https://resources.workable.com/smart-goals-template"},
                    ],
                ),
                (
                    "Feedback Systems and Continuous Development",
                    "Feedback is one of the most powerful tools a manager has for driving performance and retention. "
                    "Research consistently shows that employees who receive regular, quality feedback are more engaged "
                    "and less likely to leave. Key feedback principles:\n\n"
                    "• Be Specific — 'You delivered the report 3 days late without communicating delays' is more useful "
                    "than 'You need to improve your time management'.\n"
                    "• Be Timely — feedback should be given as close to the event as possible, not months later.\n"
                    "• Be Balanced — acknowledge strengths alongside areas for improvement (e.g., SBI model: Situation, Behaviour, Impact).\n"
                    "• Be Private — critical feedback must always be given privately, never publicly.\n"
                    "• Be Forward-looking — end feedback conversations with a clear development action or next step.\n\n"
                    "Feedback Frameworks for Managers:\n"
                    "1. SBI (Situation-Behaviour-Impact) — describe the context, the behaviour observed, and its impact.\n"
                    "2. COIN (Context, Observation, Impact, Next Steps) — structured approach for developmental feedback.\n"
                    "3. One-on-One Check-ins — weekly or biweekly structured conversations about workload, blockers, and growth.\n\n"
                    "Individual Development Plans (IDPs) should be created for each team member based on their career goals and "
                    "identified skill gaps. IDPs must be reviewed quarterly and updated annually.",
                    "https://www.youtube.com/results?search_query=employee+feedback+systems+HR+management",
                    [
                        {"label": "Article: How to Give Effective Employee Feedback", "url": "https://resources.workable.com/feedback-to-employees"},
                        {"label": "Video: Feedback Frameworks for Managers (YouTube Search)", "url": "https://www.youtube.com/results?search_query=giving+effective+feedback+to+employees+management"},
                    ],
                    [
                        {"label": "Individual Development Plan (IDP) Template", "url": "https://resources.workable.com/individual-development-plan-template"},
                        {"label": "One-on-One Meeting Template", "url": "https://resources.workable.com/one-on-one-meeting-agenda-template"},
                    ],
                ),
                (
                    "Conflict Handling and Grievance Resolution",
                    "Workplace conflict is inevitable. Unresolved conflict leads to disengagement, absenteeism, and "
                    "attrition. Effective managers address conflict early, before it escalates. Types of workplace conflict:\n\n"
                    "• Interpersonal conflicts — personality clashes, communication breakdowns between team members.\n"
                    "• Task conflicts — disagreements about work methods, priorities, or ownership.\n"
                    "• Role ambiguity conflicts — unclear responsibilities causing friction.\n"
                    "• Manager-employee conflicts — issues with performance expectations, recognition, or management style.\n\n"
                    "Conflict Resolution Steps for Managers:\n"
                    "1. Address it early — do not ignore conflict hoping it resolves itself.\n"
                    "2. Meet parties individually first — understand each perspective without the other person present.\n"
                    "3. Facilitate a structured conversation — set ground rules (no interruptions, respectful tone).\n"
                    "4. Focus on interests, not positions — ask 'What outcome does each person need?'\n"
                    "5. Agree on a resolution and document it — include agreed actions, timelines, and follow-up date.\n"
                    "6. Escalate to HR if unresolved — once a formal grievance is raised, follow the company's grievance procedure.\n\n"
                    "Formal Grievance Process (India): Informal resolution attempt → Written grievance to manager/HR → "
                    "Grievance Committee review → Decision within 30 days → Appeals process. "
                    "Managers must not dismiss or trivialise grievances. Every grievance must be acknowledged in writing "
                    "within 48 hours and resolved within 30 working days.",
                    "https://www.youtube.com/results?search_query=workplace+conflict+resolution+HR+management",
                    [
                        {"label": "Article: Workplace Conflict Resolution — A Manager's Guide", "url": "https://resources.workable.com/employee-relations-guide"},
                        {"label": "Video: Conflict Resolution at Work (YouTube Search)", "url": "https://www.youtube.com/results?search_query=workplace+conflict+resolution+steps+for+managers"},
                    ],
                    [
                        {"label": "Grievance Handling Policy Template", "url": "https://resources.workable.com/grievance-policy-template"},
                        {"label": "Conflict Resolution Worksheet for Managers", "url": "https://www.shrm.org/resourcesandtools/tools-and-samples/how-to-guides/pages/howtomanageconflict.aspx"},
                    ],
                ),
            ],
            quiz_title="Module 5 Quiz — Performance Management & Employee Relations",
            quiz_questions=[
                (
                    "A manager consistently gives higher performance ratings to employees who remind them of themselves, regardless of actual output. This is an example of:",
                    {"a": "Recency bias", "b": "Affinity bias (similarity bias)", "c": "Halo effect", "d": "Horns effect"},
                    1,
                ),
                (
                    "A team member approaches you with a concern that their workload is unmanageable and they feel unsupported. Using the SBI feedback model to respond, you should first:",
                    {"a": "Tell them to document their concerns in writing before you can help", "b": "Describe the specific situation and behaviour you have observed, and its impact on the team", "c": "Escalate to HR immediately without further discussion", "d": "Refer them to the company's mental health helpline"},
                    1,
                ),
                (
                    "Two team members have an ongoing conflict affecting team morale. As their manager, what is the correct first step?",
                    {"a": "Bring both employees together immediately and demand a resolution", "b": "Ignore it — team members should resolve personal issues themselves", "c": "Meet each person individually first to understand their perspective", "d": "Issue a formal warning to both parties"},
                    2,
                ),
                (
                    "Under a formal grievance process in India, a written grievance must typically be acknowledged and a resolution provided within:",
                    {"a": "7 days of submission", "b": "15 days of submission", "c": "30 working days of submission", "d": "90 days of submission"},
                    2,
                ),
                (
                    "Which appraisal model collects feedback from the employee's manager, peers, subordinates, and the employee themselves?",
                    {"a": "OKR-based review", "b": "Bell curve distribution", "c": "360-degree feedback", "d": "Continuous performance management"},
                    2,
                ),
            ],
            assignment_data=(
                "Case Study: The Performance Crisis at Pinnacle Consulting",
                "Case Study: At Pinnacle Consulting, three senior consultants have filed grievances with HR, "
                "all citing the same manager, Deepak:\n"
                "• Consultant A: Says Deepak gives the highest ratings exclusively to people who socialise with him "
                "outside work, regardless of work quality.\n"
                "• Consultant B: Received a negative performance rating but was never told about any performance issues "
                "during the year — no feedback, no warnings, no one-on-ones.\n"
                "• Consultant C: Reported a conflict with a junior team member 2 months ago. Deepak acknowledged it "
                "verbally but took no action. The conflict has escalated and Consultant C is now considering resignation.\n\n"
                "Your tasks:\n"
                "1. Identify the performance management failures in each of the 3 consultant cases. For each, explain "
                "which best practice or process was violated.\n"
                "2. Develop a corrective action plan for Deepak: what must he change in his management approach and "
                "what HR-supported training or intervention would you recommend?\n"
                "3. Write a 90-day performance improvement plan (PIP) outline for Consultant B, who is underperforming. "
                "Include: current performance gaps, SMART goals for 90 days, check-in schedule, and success criteria.",
                "Format as 3 clearly headed sections (500–700 words total). "
                "Reference the appraisal, feedback, and conflict resolution frameworks from this module. "
                "Your PIP must be specific, fair, and developmental — not punitive. Submit as a PDF document.",
            ),
        )

        # ── Final Assessment (Course-level) ───────────────────────────
        final_assessment = Assessment(
            tenant_id=tenant.id,
            module_id=None,
            title="HR & Compliance Final Assessment",
            assessment_type="exam",
            passing_score=75,
            time_limit_minutes=45,
            marks_per_question=2,
        )
        db.add(final_assessment)
        db.flush()

        final_questions = [
            (
                "Which of the following actions by a manager is MOST likely to constitute a POSH Act violation?",
                {"a": "Assigning a junior employee a challenging project without prior notice", "b": "Making repeated comments about a female colleague's appearance despite being asked to stop", "c": "Declining an employee's leave request during a critical project deadline", "d": "Giving a low performance rating without adequate documentation"},
                1,
            ),
            (
                "Under the Maternity Benefit Act 2017 (India), a woman who has had at least 2 children is entitled to how many weeks of paid maternity leave?",
                {"a": "8 weeks", "b": "12 weeks", "c": "18 weeks", "d": "26 weeks"},
                1,
            ),
            (
                "An employee refuses to sign a new IT policy that restricts personal device use. As HR, the most appropriate response is:",
                {"a": "Immediately terminate the employee for insubordination", "b": "Have a conversation to understand their concern, document it, and escalate if they continue to refuse", "c": "Exempt the employee since the policy is voluntary", "d": "Retroactively apply the policy without the employee's signature"},
                1,
            ),
            (
                "Which document must an organisation provide to an employee within 30 days of their exit, after completing Full & Final Settlement?",
                {"a": "A new employment contract for future reference", "b": "Relieving letter and experience certificate", "c": "Provident Fund registration certificate", "d": "A tax exemption letter from the IT department"},
                1,
            ),
            (
                "A manager gives all team members the same rating of '3 out of 5' to avoid conflict and extra paperwork. This is an example of:",
                {"a": "Recency bias", "b": "Halo effect", "c": "Central tendency bias", "d": "Horns effect"},
                2,
            ),
            (
                "The Employees' Provident Fund Act 1952 mandates that organisations with how many or more employees must enrol employees in EPF?",
                {"a": "5 or more", "b": "10 or more", "c": "20 or more", "d": "50 or more"},
                2,
            ),
            (
                "An employee raises a formal grievance about workplace bullying. According to best practice, the HR team must acknowledge the complaint in writing within:",
                {"a": "24 hours and resolve it within 7 days", "b": "48 hours and resolve it within 30 working days", "c": "72 hours and resolve it within 60 days", "d": "1 week and resolve it at the next quarterly review"},
                1,
            ),
            (
                "Which of the following interview questions is LEGAL and appropriate to ask a job candidate?",
                {"a": "'Are you planning to have children in the next two years?'", "b": "'What is your religion and does it affect your work schedule?'", "c": "'Can you describe a situation where you managed a difficult client or stakeholder?'", "d": "'What is your exact age and date of birth?'"},
                2,
            ),
            (
                "Under the POSH Act 2013, what is the maximum time limit for the Internal Complaints Committee (ICC) to complete its enquiry into a sexual harassment complaint?",
                {"a": "30 days from the date of complaint", "b": "60 days from the date of complaint", "c": "90 days from the date of complaint", "d": "6 months from the date of complaint"},
                2,
            ),
            (
                "A manager consistently rates a well-liked team member highly despite average performance because the employee is always positive and enthusiastic. This is an example of:",
                {"a": "Recency bias — judging based on recent positive attitude", "b": "Halo effect — one positive trait influencing the overall rating", "c": "Affinity bias — the manager relates to the employee personally", "d": "Attribution bias — crediting external factors for performance"},
                1,
            ),
        ]

        for q_text, q_opts, q_correct in final_questions:
            q = AssessmentQuestion(
                tenant_id=tenant.id,
                assessment_id=final_assessment.id,
                question_text=q_text,
                question_type="mcq",
                options_json=q_opts,
                correct_answer_index=q_correct,
                marks=2,
            )
            db.add(q)

        db.commit()


def safe_init() -> None:
    init_db()
    seed_demo_data()

