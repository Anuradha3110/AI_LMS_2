"""Motor async connection to MongoDB Atlas — webx database."""
import certifi
import motor.motor_asyncio
from app.core.config import settings

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None


def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.MONGODB_URL,
            tlsCAFile=certifi.where(),
        )
    return _client


def webx_db():
    return get_mongo_client()["webx"]


def users_col():
    return webx_db()["users"]


def tenants_col():
    return webx_db()["tenants"]


def team_progress_col():
    return webx_db()["Team_progress"]


def leaderboard_col():
    return webx_db()["Leaderboard"]


def attendence_col():
    return webx_db()["Attendence"]


def courses_col():
    return webx_db()["Course"]


def leave_requests_col():
    return webx_db()["Leave_requests"]


def user_profiles_col():
    return webx_db()["User_profiles"]


def learning_flow_col():
    return webx_db()["learning_flow_analytics"]


def admin_audit_logs_col():
    return webx_db()["admin_audit_logs"]


def admin_security_alerts_col():
    return webx_db()["admin_security_alerts"]


def knowledge_content_library_col():
    return webx_db()["knowledge_content_library"]


def knowledge_base_articles_col():
    return webx_db()["knowledge_base_articles"]


def knowledge_certificates_col():
    return webx_db()["knowledge_certificates"]


def knowledge_collaboration_col():
    return webx_db()["knowledge_collaboration"]


def performance_instructors_col():
    return webx_db()["performance_instructors"]


def performance_revenue_col():
    return webx_db()["performance_revenue"]


def performance_engagement_col():
    return webx_db()["performance_engagement"]


def performance_benchmarks_col():
    return webx_db()["performance_benchmarks"]


def performance_alerts_col():
    return webx_db()["performance_alerts"]


def performance_learners_col():
    return webx_db()["performance_learners"]


def adaptive_rules_col():
    return webx_db()["adaptive_rules"]


def adaptive_role_configs_col():
    return webx_db()["adaptive_role_configs"]


def adaptive_global_config_col():
    return webx_db()["adaptive_global_config"]


def adaptive_prompt_templates_col():
    return webx_db()["adaptive_prompt_templates"]


def adaptive_rule_analytics_col():
    return webx_db()["adaptive_rule_analytics"]


def adaptive_rule_versions_col():
    return webx_db()["adaptive_rule_versions"]


def emp_progress_col():
    return webx_db()["emp_progress"]


def emp_performance_col():
    return webx_db()["emp_performance"]


def emp_leaderboard_col():
    return webx_db()["emp_leaderboard"]


def emp_schedule_col():
    return webx_db()["emp_schedule"]


def emp_role_access_col():
    return webx_db()["emp_role_access"]


def emp_ideas_col():
    return webx_db()["emp_ideas"]


def leave_balances_col():
    return webx_db()["Leave_balances"]


def leave_policies_col():
    return webx_db()["Leave_policies"]
