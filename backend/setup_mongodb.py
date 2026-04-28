"""
MongoDB Atlas Setup Script for AI LMS 2
Creates all 54 collections with JSON Schema validators and indexes.
Connection: mongodb+srv://Anuradha_dev:Hexa%402201@cluster0.iyts5ys.mongodb.net/
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid, OperationFailure
import sys

CONNECTION_STRING = "mongodb+srv://Anuradha_dev:Hexa%402201@cluster0.iyts5ys.mongodb.net/"
DB_NAME = "AI_LMS_db"

# ─────────────────────────────────────────────
# Schema & Index definitions for all 54 collections
# ─────────────────────────────────────────────

COLLECTIONS = {

    # ── 1. TENANTS ──────────────────────────────────────────────────────────
    "tenants": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["name", "slug", "plan", "status", "created_at"],
                "properties": {
                    "name":             {"bsonType": "string"},
                    "slug":             {"bsonType": "string"},
                    "plan":             {"bsonType": "string", "enum": ["free","starter","pro","enterprise"]},
                    "status":           {"bsonType": "string", "enum": ["active","suspended","onboarding"]},
                    "domain_whitelist": {"bsonType": ["array","null"]},
                    "api_key":          {"bsonType": ["string","null"]},
                    "max_users":        {"bsonType": ["int","null"]},
                    "max_courses":      {"bsonType": ["int","null"]},
                    "created_at":       {"bsonType": "date"},
                    "updated_at":       {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("slug", ASCENDING)], "unique": True},
            {"keys": [("api_key", ASCENDING)], "unique": True, "sparse": True},
        ]
    },

    # ── 2. TENANT_PROFILES ──────────────────────────────────────────────────
    "tenant_profiles": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "created_at"],
                "properties": {
                    "tenant_id":            {"bsonType": "string"},
                    "business_domain":      {"bsonType": ["string","null"]},
                    "industry":             {"bsonType": ["string","null"]},
                    "logo_url":             {"bsonType": ["string","null"]},
                    "primary_color":        {"bsonType": ["string","null"]},
                    "secondary_color":      {"bsonType": ["string","null"]},
                    "custom_domain":        {"bsonType": ["string","null"]},
                    "welcome_message":      {"bsonType": ["string","null"]},
                    "role_template_json":   {"bsonType": ["object","null"]},
                    "taxonomy_mapping_json":{"bsonType": ["object","null"]},
                    "generation_prefs_json":{"bsonType": ["object","null"]},
                    "connectors_json":      {"bsonType": ["object","null"]},
                    "labels_json":          {"bsonType": ["object","null"]},
                    "ai_preferences":       {"bsonType": ["object","null"]},
                    "timezone":             {"bsonType": ["string","null"]},
                    "locale":               {"bsonType": ["string","null"]},
                    "created_at":           {"bsonType": "date"},
                    "updated_at":           {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)], "unique": True},
        ]
    },

    # ── 3. TENANT_SUBSCRIPTIONS ─────────────────────────────────────────────
    "tenant_subscriptions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "plan", "is_active", "created_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "plan":          {"bsonType": "string"},
                    "billing_cycle": {"bsonType": ["string","null"], "enum": ["monthly","annual",None]},
                    "started_at":    {"bsonType": ["date","null"]},
                    "expires_at":    {"bsonType": ["date","null"]},
                    "is_active":     {"bsonType": "bool"},
                    "stripe_sub_id": {"bsonType": ["string","null"]},
                    "created_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("is_active", ASCENDING)]},
        ]
    },

    # ── 4. API_KEYS ─────────────────────────────────────────────────────────
    "api_keys": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "key_hash", "is_active", "created_at"],
                "properties": {
                    "tenant_id":    {"bsonType": "string"},
                    "key_hash":     {"bsonType": "string"},
                    "label":        {"bsonType": ["string","null"]},
                    "scopes":       {"bsonType": ["array","null"]},
                    "last_used_at": {"bsonType": ["date","null"]},
                    "expires_at":   {"bsonType": ["date","null"]},
                    "created_by":   {"bsonType": ["string","null"]},
                    "is_active":    {"bsonType": "bool"},
                    "created_at":   {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("key_hash", ASCENDING)], "unique": True},
        ]
    },

    # ── 5. AUDIT_LOGS ───────────────────────────────────────────────────────
    "audit_logs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "action", "created_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "user_id":       {"bsonType": ["string","null"]},
                    "action":        {"bsonType": "string"},
                    "resource_type": {"bsonType": ["string","null"]},
                    "resource_id":   {"bsonType": ["string","null"]},
                    "metadata_json": {"bsonType": ["object","null"]},
                    "ip_address":    {"bsonType": ["string","null"]},
                    "user_agent":    {"bsonType": ["string","null"]},
                    "created_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("action", ASCENDING)]},
            {"keys": [("resource_type", ASCENDING), ("resource_id", ASCENDING)]},
            {"keys": [("created_at", DESCENDING)]},
        ]
    },

    # ── 6. EMBED_CONFIGS ────────────────────────────────────────────────────
    "embed_configs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "embed_token", "is_active", "created_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "allowed_origins": {"bsonType": ["array","null"]},
                    "embed_token":     {"bsonType": "string"},
                    "widget_config":   {"bsonType": ["object","null"]},
                    "is_active":       {"bsonType": "bool"},
                    "created_at":      {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("embed_token", ASCENDING)], "unique": True},
        ]
    },

    # ── 7. USERS ─────────────────────────────────────────────────────────────
    "users": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "email", "full_name", "role", "is_active", "created_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "email":         {"bsonType": "string"},
                    "full_name":     {"bsonType": "string"},
                    "password_hash": {"bsonType": ["string","null"]},
                    "role":          {"bsonType": "string", "enum": ["admin","manager","employee","viewer"]},
                    "avatar_url":    {"bsonType": ["string","null"]},
                    "department":    {"bsonType": ["string","null"]},
                    "job_title":     {"bsonType": ["string","null"]},
                    "manager_id":    {"bsonType": ["string","null"]},
                    "is_active":     {"bsonType": "bool"},
                    "last_login_at": {"bsonType": ["date","null"]},
                    "created_at":    {"bsonType": "date"},
                    "updated_at":    {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING), ("email", ASCENDING)], "unique": True},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("role", ASCENDING)]},
            {"keys": [("manager_id", ASCENDING)]},
        ]
    },

    # ── 8. USER_SESSIONS ─────────────────────────────────────────────────────
    "user_sessions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "tenant_id", "token_hash", "created_at"],
                "properties": {
                    "user_id":    {"bsonType": "string"},
                    "tenant_id":  {"bsonType": "string"},
                    "token_hash": {"bsonType": "string"},
                    "ip_address": {"bsonType": ["string","null"]},
                    "user_agent": {"bsonType": ["string","null"]},
                    "created_at": {"bsonType": "date"},
                    "expires_at": {"bsonType": ["date","null"]},
                    "revoked_at": {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("token_hash", ASCENDING)]},
            {"keys": [("expires_at", ASCENDING)], "expireAfterSeconds": 0},  # TTL index
        ]
    },

    # ── 9. USER_PREFERENCES ──────────────────────────────────────────────────
    "user_preferences": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "tenant_id"],
                "properties": {
                    "user_id":            {"bsonType": "string"},
                    "tenant_id":          {"bsonType": "string"},
                    "language":           {"bsonType": ["string","null"]},
                    "notification_prefs": {"bsonType": ["object","null"]},
                    "learning_goals":     {"bsonType": ["object","null"]},
                    "ui_preferences":     {"bsonType": ["object","null"]},
                    "updated_at":         {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("user_id", ASCENDING)], "unique": True},
            {"keys": [("tenant_id", ASCENDING)]},
        ]
    },

    # ── 10. DEPARTMENTS ──────────────────────────────────────────────────────
    "departments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "created_at"],
                "properties": {
                    "tenant_id":    {"bsonType": "string"},
                    "name":         {"bsonType": "string"},
                    "parent_id":    {"bsonType": ["string","null"]},
                    "head_user_id": {"bsonType": ["string","null"]},
                    "description":  {"bsonType": ["string","null"]},
                    "created_at":   {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("parent_id", ASCENDING)]},
        ]
    },

    # ── 11. NOTIFICATIONS ────────────────────────────────────────────────────
    "notifications": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "type", "title", "is_read", "created_at"],
                "properties": {
                    "tenant_id":  {"bsonType": "string"},
                    "user_id":    {"bsonType": "string"},
                    "type":       {"bsonType": "string"},
                    "title":      {"bsonType": "string"},
                    "message":    {"bsonType": ["string","null"]},
                    "data_json":  {"bsonType": ["object","null"]},
                    "is_read":    {"bsonType": "bool"},
                    "read_at":    {"bsonType": ["date","null"]},
                    "created_at": {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("is_read", ASCENDING)]},
            {"keys": [("type", ASCENDING)]},
            {"keys": [("created_at", DESCENDING)]},
        ]
    },

    # ── 12. WEBSITE_SOURCES ──────────────────────────────────────────────────
    "website_sources": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "source_type", "is_active", "created_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "name":          {"bsonType": "string"},
                    "source_type":   {"bsonType": "string", "enum": ["google_sheets","pdf","docx","url_scrape","rest_api","manual","csv","youtube","confluence","notion"]},
                    "source_uri":    {"bsonType": ["string","null"]},
                    "auth_config":   {"bsonType": ["object","null"]},
                    "sync_schedule": {"bsonType": ["string","null"]},
                    "last_synced_at":{"bsonType": ["date","null"]},
                    "sync_status":   {"bsonType": ["string","null"], "enum": ["idle","syncing","success","error",None]},
                    "sync_error":    {"bsonType": ["string","null"]},
                    "is_active":     {"bsonType": "bool"},
                    "created_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("source_type", ASCENDING)]},
            {"keys": [("sync_status", ASCENDING)]},
        ]
    },

    # ── 13. INGESTION_JOBS ───────────────────────────────────────────────────
    "ingestion_jobs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "source_id", "status", "created_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "source_id":     {"bsonType": "string"},
                    "status":        {"bsonType": "string", "enum": ["queued","running","completed","failed"]},
                    "items_created": {"bsonType": ["int","null"]},
                    "items_updated": {"bsonType": ["int","null"]},
                    "items_failed":  {"bsonType": ["int","null"]},
                    "error_details": {"bsonType": ["object","null"]},
                    "started_at":    {"bsonType": ["date","null"]},
                    "completed_at":  {"bsonType": ["date","null"]},
                    "created_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("source_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
        ]
    },

    # ── 14. KNOWLEDGE_ITEMS ──────────────────────────────────────────────────
    "knowledge_items": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "title", "content", "created_at"],
                "properties": {
                    "tenant_id":    {"bsonType": "string"},
                    "source_id":    {"bsonType": ["string","null"]},
                    "source_kind":  {"bsonType": ["string","null"]},
                    "source_tab":   {"bsonType": ["string","null"]},
                    "source_gid":   {"bsonType": ["string","null"]},
                    "source_row":   {"bsonType": ["int","null"]},
                    "source_url":   {"bsonType": ["string","null"]},
                    "canonical_key":{"bsonType": ["string","null"]},
                    "title":        {"bsonType": "string"},
                    "content":      {"bsonType": "string"},
                    "content_type": {"bsonType": ["string","null"]},
                    "category":     {"bsonType": ["string","null"]},
                    "service_type": {"bsonType": ["string","null"]},
                    "team_hint":    {"bsonType": ["string","null"]},
                    "description":  {"bsonType": ["string","null"]},
                    "tags_json":    {"bsonType": ["array","null"]},
                    "attrs_json":   {"bsonType": ["object","null"]},
                    "checksum":     {"bsonType": ["string","null"]},
                    "is_indexed":   {"bsonType": ["bool","null"]},
                    "created_at":   {"bsonType": "date"},
                    "updated_at":   {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("canonical_key", ASCENDING)]},
            {"keys": [("category", ASCENDING)]},
            {"keys": [("team_hint", ASCENDING)]},
            {"keys": [("checksum", ASCENDING)]},
            {"keys": [("source_id", ASCENDING)]},
        ]
    },

    # ── 15. COMPANY_BLUEPRINTS ───────────────────────────────────────────────
    "company_blueprints": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "title", "status", "created_at"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "title":            {"bsonType": "string"},
                    "version":          {"bsonType": ["int","null"]},
                    "blueprint_json":   {"bsonType": ["object","null"]},
                    "source_refs_json": {"bsonType": ["object","null"]},
                    "source":           {"bsonType": ["string","null"]},
                    "status":           {"bsonType": "string", "enum": ["draft","generating","ready","applied"]},
                    "prompt_used":      {"bsonType": ["string","null"]},
                    "model_used":       {"bsonType": ["string","null"]},
                    "applied_course_id":{"bsonType": ["string","null"]},
                    "created_by":       {"bsonType": ["string","null"]},
                    "created_at":       {"bsonType": "date"},
                    "updated_at":       {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
        ]
    },

    # ── 16. COURSES ──────────────────────────────────────────────────────────
    "courses": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "title", "status", "created_at"],
                "properties": {
                    "tenant_id":                   {"bsonType": "string"},
                    "title":                       {"bsonType": "string"},
                    "description":                 {"bsonType": ["string","null"]},
                    "objectives":                  {"bsonType": ["string","null"]},
                    "category":                    {"bsonType": ["string","null"]},
                    "thumbnail_url":               {"bsonType": ["string","null"]},
                    "status":                      {"bsonType": "string", "enum": ["draft","review","published","archived"]},
                    "visibility":                  {"bsonType": ["string","null"]},
                    "level":                       {"bsonType": ["string","null"]},
                    "difficulty":                  {"bsonType": ["string","null"]},
                    "duration_hours":              {"bsonType": ["int","null"]},
                    "estimated_hours":             {"bsonType": ["double","null"]},
                    "language":                    {"bsonType": ["string","null"]},
                    "progress_tracking_enabled":   {"bsonType": ["bool","null"]},
                    "certification_enabled":       {"bsonType": ["bool","null"]},
                    "instructor_name":             {"bsonType": ["string","null"]},
                    "is_ai_generated":             {"bsonType": ["bool","null"]},
                    "blueprint_id":                {"bsonType": ["string","null"]},
                    "created_by":                  {"bsonType": ["string","null"]},
                    "tags_json":                   {"bsonType": ["array","null"]},
                    "published_at":                {"bsonType": ["date","null"]},
                    "created_at":                  {"bsonType": "date"},
                    "updated_at":                  {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
            {"keys": [("blueprint_id", ASCENDING)]},
            {"keys": [("category", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING), ("status", ASCENDING)]},
        ]
    },

    # ── 17. COURSE_PREREQUISITES ─────────────────────────────────────────────
    "course_prerequisites": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "course_id", "required_course_id", "created_at"],
                "properties": {
                    "tenant_id":          {"bsonType": "string"},
                    "course_id":          {"bsonType": "string"},
                    "required_course_id": {"bsonType": "string"},
                    "created_at":         {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
        ]
    },

    # ── 18. LEARNING_PATHS ───────────────────────────────────────────────────
    "learning_paths": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "created_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "name":            {"bsonType": "string"},
                    "description":     {"bsonType": ["string","null"]},
                    "is_ai_generated": {"bsonType": ["bool","null"]},
                    "course_sequence": {"bsonType": ["array","null"]},
                    "target_role":     {"bsonType": ["string","null"]},
                    "thumbnail_url":   {"bsonType": ["string","null"]},
                    "created_by":      {"bsonType": ["string","null"]},
                    "created_at":      {"bsonType": "date"},
                    "updated_at":      {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("target_role", ASCENDING)]},
        ]
    },

    # ── 19. USER_LEARNING_PATH_ENROLLMENTS ───────────────────────────────────
    "user_learning_path_enrollments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "path_id", "tenant_id", "enrolled_at"],
                "properties": {
                    "user_id":            {"bsonType": "string"},
                    "path_id":            {"bsonType": "string"},
                    "tenant_id":          {"bsonType": "string"},
                    "current_course_idx": {"bsonType": ["int","null"]},
                    "enrolled_at":        {"bsonType": "date"},
                    "completed_at":       {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("path_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("path_id", ASCENDING)], "unique": True},
        ]
    },

    # ── 20. MODULES ──────────────────────────────────────────────────────────
    "modules": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "course_id", "title", "created_at"],
                "properties": {
                    "tenant_id":         {"bsonType": "string"},
                    "course_id":         {"bsonType": "string"},
                    "title":             {"bsonType": "string"},
                    "description":       {"bsonType": ["string","null"]},
                    "section_title":     {"bsonType": ["string","null"]},
                    "order_index":       {"bsonType": ["int","null"]},
                    "unlock_condition":  {"bsonType": ["object","null"]},
                    "estimated_minutes": {"bsonType": ["int","null"]},
                    "created_at":        {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING), ("order_index", ASCENDING)]},
        ]
    },

    # ── 21. LESSONS ──────────────────────────────────────────────────────────
    "lessons": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "module_id", "title", "created_at"],
                "properties": {
                    "tenant_id":                    {"bsonType": "string"},
                    "module_id":                    {"bsonType": "string"},
                    "title":                        {"bsonType": "string"},
                    "content_text":                 {"bsonType": ["string","null"]},
                    "content_type":                 {"bsonType": ["string","null"]},
                    "video_url":                    {"bsonType": ["string","null"]},
                    "subtitle_url":                 {"bsonType": ["string","null"]},
                    "video_duration_sec":           {"bsonType": ["int","null"]},
                    "reading_materials_json":       {"bsonType": ["object","null"]},
                    "downloadable_resources_json":  {"bsonType": ["object","null"]},
                    "attachments_json":             {"bsonType": ["array","null"]},
                    "knowledge_refs":               {"bsonType": ["array","null"]},
                    "order_index":                  {"bsonType": ["int","null"]},
                    "is_ai_generated":              {"bsonType": ["bool","null"]},
                    "source_refs_json":             {"bsonType": ["object","null"]},
                    "created_at":                   {"bsonType": "date"},
                    "updated_at":                   {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("module_id", ASCENDING)]},
            {"keys": [("module_id", ASCENDING), ("order_index", ASCENDING)]},
        ]
    },

    # ── 22. LESSON_VERSIONS ──────────────────────────────────────────────────
    "lesson_versions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["lesson_id", "tenant_id", "version", "changed_at"],
                "properties": {
                    "lesson_id":      {"bsonType": "string"},
                    "tenant_id":      {"bsonType": "string"},
                    "version":        {"bsonType": "int"},
                    "content_text":   {"bsonType": ["string","null"]},
                    "changed_by":     {"bsonType": ["string","null"]},
                    "change_summary": {"bsonType": ["string","null"]},
                    "changed_at":     {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("lesson_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
        ]
    },

    # ── 23. ASSIGNMENTS ──────────────────────────────────────────────────────
    "assignments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "module_id", "title", "created_at"],
                "properties": {
                    "tenant_id":  {"bsonType": "string"},
                    "module_id":  {"bsonType": "string"},
                    "title":      {"bsonType": "string"},
                    "description":{"bsonType": ["string","null"]},
                    "guidelines": {"bsonType": ["string","null"]},
                    "deadline":   {"bsonType": ["date","null"]},
                    "created_at": {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("module_id", ASCENDING)]},
        ]
    },

    # ── 24. ASSIGNMENT_SUBMISSIONS ───────────────────────────────────────────
    "assignment_submissions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "assignment_id", "submitted_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "user_id":         {"bsonType": "string"},
                    "assignment_id":   {"bsonType": "string"},
                    "submission_text": {"bsonType": ["string","null"]},
                    "submitted_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("assignment_id", ASCENDING)]},
        ]
    },

    # ── 25. ENROLLMENTS ──────────────────────────────────────────────────────
    "enrollments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "course_id", "enrolled_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "user_id":         {"bsonType": "string"},
                    "course_id":       {"bsonType": "string"},
                    "access_type":     {"bsonType": ["string","null"]},
                    "enrollment_type": {"bsonType": ["string","null"]},
                    "enrolled_at":     {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("course_id", ASCENDING)], "unique": True},
        ]
    },

    # ── 26. COURSE_FEEDBACK ──────────────────────────────────────────────────
    "course_feedback": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "course_id", "created_at"],
                "properties": {
                    "tenant_id":  {"bsonType": "string"},
                    "user_id":    {"bsonType": "string"},
                    "course_id":  {"bsonType": "string"},
                    "rating":     {"bsonType": ["int","null"], "minimum": 1, "maximum": 5},
                    "comment":    {"bsonType": ["string","null"]},
                    "created_at": {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
        ]
    },

    # ── 27. CERTIFICATES ─────────────────────────────────────────────────────
    "certificates": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "course_id", "certificate_number", "issued_at"],
                "properties": {
                    "tenant_id":          {"bsonType": "string"},
                    "user_id":            {"bsonType": "string"},
                    "course_id":          {"bsonType": "string"},
                    "certificate_number": {"bsonType": "string"},
                    "recipient_name":     {"bsonType": ["string","null"]},
                    "course_title":       {"bsonType": ["string","null"]},
                    "instructor_name":    {"bsonType": ["string","null"]},
                    "issued_at":          {"bsonType": "date"},
                    "template_data_json": {"bsonType": ["object","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
            {"keys": [("certificate_number", ASCENDING)], "unique": True},
        ]
    },

    # ── 28. COURSE_ASSIGNMENTS ───────────────────────────────────────────────
    "course_assignments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "course_id", "status", "assigned_at"],
                "properties": {
                    "tenant_id":      {"bsonType": "string"},
                    "assigned_by_id": {"bsonType": ["string","null"]},
                    "user_id":        {"bsonType": "string"},
                    "course_id":      {"bsonType": "string"},
                    "deadline":       {"bsonType": ["date","null"]},
                    "status":         {"bsonType": "string", "enum": ["not_started","in_progress","completed"]},
                    "assigned_at":    {"bsonType": "date"},
                    "completed_at":   {"bsonType": ["date","null"]},
                    "notes":          {"bsonType": ["string","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("course_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
            {"keys": [("assigned_by_id", ASCENDING)]},
        ]
    },

    # ── 29. QUESTION_BANK ────────────────────────────────────────────────────
    "question_bank": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "question_text", "question_type", "created_at"],
                "properties": {
                    "tenant_id":          {"bsonType": "string"},
                    "question_text":      {"bsonType": "string"},
                    "question_type":      {"bsonType": "string", "enum": ["mcq","true_false","short_answer","code","scenario"]},
                    "options_json":       {"bsonType": ["object","null"]},
                    "correct_answer_json":{"bsonType": ["object","null"]},
                    "explanation":        {"bsonType": ["string","null"]},
                    "difficulty":         {"bsonType": ["string","null"], "enum": ["easy","medium","hard",None]},
                    "tags_json":          {"bsonType": ["array","null"]},
                    "domain":             {"bsonType": ["string","null"]},
                    "language":           {"bsonType": ["string","null"]},
                    "is_ai_generated":    {"bsonType": ["bool","null"]},
                    "ai_model_used":      {"bsonType": ["string","null"]},
                    "usage_count":        {"bsonType": ["int","null"]},
                    "avg_correct_rate":   {"bsonType": ["double","null"]},
                    "created_by":         {"bsonType": ["string","null"]},
                    "reviewed_by":        {"bsonType": ["string","null"]},
                    "review_status":      {"bsonType": ["string","null"], "enum": ["pending","approved","rejected",None]},
                    "created_at":         {"bsonType": "date"},
                    "updated_at":         {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("question_type", ASCENDING)]},
            {"keys": [("difficulty", ASCENDING)]},
            {"keys": [("domain", ASCENDING)]},
            {"keys": [("review_status", ASCENDING)]},
        ]
    },

    # ── 30. ASSESSMENTS ──────────────────────────────────────────────────────
    "assessments": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "title", "assessment_type", "created_at"],
                "properties": {
                    "tenant_id":         {"bsonType": "string"},
                    "module_id":         {"bsonType": ["string","null"]},
                    "title":             {"bsonType": "string"},
                    "instructions":      {"bsonType": ["string","null"]},
                    "assessment_type":   {"bsonType": "string", "enum": ["quiz","exam","survey","practice"]},
                    "passing_score":     {"bsonType": ["int","null"]},
                    "time_limit_minutes":{"bsonType": ["int","null"]},
                    "time_limit_sec":    {"bsonType": ["int","null"]},
                    "max_attempts":      {"bsonType": ["int","null"]},
                    "marks_per_question":{"bsonType": ["int","null"]},
                    "shuffle_questions": {"bsonType": ["bool","null"]},
                    "shuffle_options":   {"bsonType": ["bool","null"]},
                    "is_ai_generated":   {"bsonType": ["bool","null"]},
                    "created_at":        {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("module_id", ASCENDING)]},
            {"keys": [("assessment_type", ASCENDING)]},
        ]
    },

    # ── 31. ASSESSMENT_QUESTIONS ─────────────────────────────────────────────
    "assessment_questions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "assessment_id", "question_text"],
                "properties": {
                    "tenant_id":            {"bsonType": "string"},
                    "assessment_id":        {"bsonType": "string"},
                    "question_text":        {"bsonType": "string"},
                    "question_type":        {"bsonType": ["string","null"]},
                    "options_json":         {"bsonType": ["object","null"]},
                    "correct_answer_index": {"bsonType": ["int","null"]},
                    "marks":                {"bsonType": ["int","null"]},
                    "bank_question_id":     {"bsonType": ["string","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("assessment_id", ASCENDING)]},
        ]
    },

    # ── 32. ASSESSMENT_QUESTION_LINKS ────────────────────────────────────────
    "assessment_question_links": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["assessment_id", "question_id", "tenant_id"],
                "properties": {
                    "assessment_id": {"bsonType": "string"},
                    "question_id":   {"bsonType": "string"},
                    "tenant_id":     {"bsonType": "string"},
                    "order_index":   {"bsonType": ["int","null"]},
                    "points":        {"bsonType": ["double","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("assessment_id", ASCENDING)]},
            {"keys": [("question_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("assessment_id", ASCENDING), ("question_id", ASCENDING)], "unique": True},
        ]
    },

    # ── 33. ASSESSMENT_SUBMISSIONS ───────────────────────────────────────────
    "assessment_submissions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "assessment_id", "submitted_at"],
                "properties": {
                    "tenant_id":      {"bsonType": "string"},
                    "user_id":        {"bsonType": "string"},
                    "assessment_id":  {"bsonType": "string"},
                    "attempt_number": {"bsonType": ["int","null"]},
                    "answers_json":   {"bsonType": ["object","null"]},
                    "score":          {"bsonType": ["int","null"]},
                    "passed":         {"bsonType": ["bool","null"]},
                    "time_taken_sec": {"bsonType": ["int","null"]},
                    "ai_feedback":    {"bsonType": ["string","null"]},
                    "submitted_at":   {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("assessment_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("assessment_id", ASCENDING)]},
        ]
    },

    # ── 34. LESSON_PROGRESS ──────────────────────────────────────────────────
    "lesson_progress": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "lesson_id"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "user_id":          {"bsonType": "string"},
                    "lesson_id":        {"bsonType": "string"},
                    "status":           {"bsonType": ["string","null"], "enum": ["not_started","in_progress","completed",None]},
                    "progress_pct":     {"bsonType": ["double","null"]},
                    "time_spent_sec":   {"bsonType": ["int","null"]},
                    "last_position_sec":{"bsonType": ["int","null"]},
                    "completed_at":     {"bsonType": ["date","null"]},
                    "updated_at":       {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("lesson_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("lesson_id", ASCENDING)], "unique": True},
        ]
    },

    # ── 35. SKILL_SCORECARDS ─────────────────────────────────────────────────
    "skill_scorecards": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "skill_name"],
                "properties": {
                    "tenant_id":      {"bsonType": "string"},
                    "user_id":        {"bsonType": "string"},
                    "skill_name":     {"bsonType": "string"},
                    "score":          {"bsonType": ["int","null"]},
                    "kpi_source":     {"bsonType": ["string","null"]},
                    "last_updated_at":{"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("skill_name", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("skill_name", ASCENDING)]},
        ]
    },

    # ── 36. USER_ANALYTICS_SNAPSHOTS ─────────────────────────────────────────
    "user_analytics_snapshots": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "tenant_id", "snapshot_date", "created_at"],
                "properties": {
                    "user_id":               {"bsonType": "string"},
                    "tenant_id":             {"bsonType": "string"},
                    "snapshot_date":         {"bsonType": "string"},
                    "courses_enrolled":      {"bsonType": ["int","null"]},
                    "courses_completed":     {"bsonType": ["int","null"]},
                    "lessons_completed":     {"bsonType": ["int","null"]},
                    "avg_assessment_score":  {"bsonType": ["double","null"]},
                    "total_time_spent_sec":  {"bsonType": ["int","null"]},
                    "xp_earned_today":       {"bsonType": ["int","null"]},
                    "streak_days":           {"bsonType": ["int","null"]},
                    "skill_scores_json":     {"bsonType": ["object","null"]},
                    "created_at":            {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("snapshot_date", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("snapshot_date", ASCENDING)], "unique": True},
        ]
    },

    # ── 37. TENANT_ANALYTICS_SNAPSHOTS ───────────────────────────────────────
    "tenant_analytics_snapshots": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "snapshot_date", "created_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "snapshot_date":   {"bsonType": "string"},
                    "active_users":    {"bsonType": ["int","null"]},
                    "total_completions":{"bsonType": ["int","null"]},
                    "avg_score":       {"bsonType": ["double","null"]},
                    "content_items":   {"bsonType": ["int","null"]},
                    "ai_jobs_run":     {"bsonType": ["int","null"]},
                    "created_at":      {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("snapshot_date", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING), ("snapshot_date", ASCENDING)], "unique": True},
        ]
    },

    # ── 38. ASYNC_JOBS ───────────────────────────────────────────────────────
    "async_jobs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "job_type", "status", "created_at"],
                "properties": {
                    "tenant_id":           {"bsonType": "string"},
                    "created_by_user_id":  {"bsonType": ["string","null"]},
                    "job_type":            {"bsonType": "string"},
                    "status":              {"bsonType": "string", "enum": ["queued","running","completed","failed"]},
                    "payload_json":        {"bsonType": ["object","null"]},
                    "result_json":         {"bsonType": ["object","null"]},
                    "error_message":       {"bsonType": ["string","null"]},
                    "created_at":          {"bsonType": "date"},
                    "started_at":          {"bsonType": ["date","null"]},
                    "completed_at":        {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("job_type", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
            {"keys": [("created_by_user_id", ASCENDING)]},
            {"keys": [("created_at", DESCENDING)]},
        ]
    },

    # ── 39. AI_CONTENT_CACHE ─────────────────────────────────────────────────
    "ai_content_cache": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["cache_key", "content_type", "created_at"],
                "properties": {
                    "tenant_id":    {"bsonType": ["string","null"]},
                    "cache_key":    {"bsonType": "string"},
                    "content_type": {"bsonType": "string"},
                    "input_hash":   {"bsonType": ["string","null"]},
                    "output_text":  {"bsonType": ["string","null"]},
                    "model_used":   {"bsonType": ["string","null"]},
                    "tokens_used":  {"bsonType": ["int","null"]},
                    "created_at":   {"bsonType": "date"},
                    "expires_at":   {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("cache_key", ASCENDING)], "unique": True},
            {"keys": [("input_hash", ASCENDING)]},
            {"keys": [("content_type", ASCENDING)]},
            {"keys": [("expires_at", ASCENDING)], "expireAfterSeconds": 0},  # TTL index
        ]
    },

    # ── 40. AI_USAGE_LOGS ────────────────────────────────────────────────────
    "ai_usage_logs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "feature", "created_at"],
                "properties": {
                    "tenant_id":         {"bsonType": "string"},
                    "user_id":           {"bsonType": ["string","null"]},
                    "job_id":            {"bsonType": ["string","null"]},
                    "feature":           {"bsonType": "string"},
                    "model":             {"bsonType": ["string","null"]},
                    "prompt_tokens":     {"bsonType": ["int","null"]},
                    "completion_tokens": {"bsonType": ["int","null"]},
                    "total_tokens":      {"bsonType": ["int","null"]},
                    "latency_ms":        {"bsonType": ["int","null"]},
                    "cache_hit":         {"bsonType": ["bool","null"]},
                    "created_at":        {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("feature", ASCENDING)]},
            {"keys": [("created_at", DESCENDING)]},
        ]
    },

    # ── 41. ADAPTIVE_LEARNING_RULES ──────────────────────────────────────────
    "adaptive_learning_rules": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "is_active", "created_at"],
                "properties": {
                    "tenant_id":         {"bsonType": "string"},
                    "name":              {"bsonType": "string"},
                    "trigger_condition": {"bsonType": ["object","null"]},
                    "action":            {"bsonType": ["object","null"]},
                    "is_active":         {"bsonType": "bool"},
                    "created_at":        {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("is_active", ASCENDING)]},
        ]
    },

    # ── 42. SIMULATION_SCENARIOS ─────────────────────────────────────────────
    "simulation_scenarios": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "title", "created_at"],
                "properties": {
                    "tenant_id":              {"bsonType": "string"},
                    "blueprint_id":           {"bsonType": ["string","null"]},
                    "title":                  {"bsonType": "string"},
                    "team":                   {"bsonType": ["string","null"]},
                    "focus_topic":            {"bsonType": ["string","null"]},
                    "prompt_text":            {"bsonType": ["string","null"]},
                    "expected_outcomes_json": {"bsonType": ["object","null"]},
                    "source_refs_json":       {"bsonType": ["object","null"]},
                    "created_at":             {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("blueprint_id", ASCENDING)]},
        ]
    },

    # ── 43. SIMULATION_ATTEMPTS ──────────────────────────────────────────────
    "simulation_attempts": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "scenario_id", "status", "created_at"],
                "properties": {
                    "tenant_id":          {"bsonType": "string"},
                    "user_id":            {"bsonType": "string"},
                    "scenario_id":        {"bsonType": "string"},
                    "user_response_text": {"bsonType": ["string","null"]},
                    "score":              {"bsonType": ["int","null"]},
                    "feedback_text":      {"bsonType": ["string","null"]},
                    "status":             {"bsonType": "string", "enum": ["pending","evaluated"]},
                    "created_at":         {"bsonType": "date"},
                    "completed_at":       {"bsonType": ["date","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("scenario_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
        ]
    },

    # ── 44. USER_GAMIFICATION ────────────────────────────────────────────────
    "user_gamification": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "updated_at"],
                "properties": {
                    "tenant_id":       {"bsonType": "string"},
                    "user_id":         {"bsonType": "string"},
                    "xp_points":       {"bsonType": ["int","null"]},
                    "level":           {"bsonType": ["int","null"]},
                    "badges_count":    {"bsonType": ["int","null"]},
                    "streak_days":     {"bsonType": ["int","null"]},
                    "longest_streak":  {"bsonType": ["int","null"]},
                    "last_activity_at":{"bsonType": ["date","null"]},
                    "rank":            {"bsonType": ["int","null"]},
                    "updated_at":      {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)], "unique": True},
            {"keys": [("xp_points", DESCENDING)]},
        ]
    },

    # ── 45. XP_TRANSACTIONS ──────────────────────────────────────────────────
    "xp_transactions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["user_id", "tenant_id", "action", "xp_earned", "created_at"],
                "properties": {
                    "user_id":        {"bsonType": "string"},
                    "tenant_id":      {"bsonType": "string"},
                    "action":         {"bsonType": "string", "enum": ["lesson_complete","assessment_pass","badge_earned","streak_bonus","simulation_complete"]},
                    "xp_earned":      {"bsonType": "int"},
                    "reference_id":   {"bsonType": ["string","null"]},
                    "reference_type": {"bsonType": ["string","null"]},
                    "created_at":     {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("action", ASCENDING)]},
            {"keys": [("created_at", DESCENDING)]},
        ]
    },

    # ── 46. BADGE_DEFINITIONS ────────────────────────────────────────────────
    "badge_definitions": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["name", "is_active", "created_at"],
                "properties": {
                    "tenant_id":   {"bsonType": ["string","null"]},
                    "name":        {"bsonType": "string"},
                    "description": {"bsonType": ["string","null"]},
                    "icon":        {"bsonType": ["string","null"]},
                    "criteria":    {"bsonType": ["object","null"]},
                    "is_active":   {"bsonType": "bool"},
                    "created_at":  {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("is_active", ASCENDING)]},
        ]
    },

    # ── 47. USER_BADGES ──────────────────────────────────────────────────────
    "user_badges": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "badge_code", "awarded_at"],
                "properties": {
                    "tenant_id":  {"bsonType": "string"},
                    "user_id":    {"bsonType": "string"},
                    "badge_id":   {"bsonType": ["string","null"]},
                    "badge_code": {"bsonType": "string"},
                    "badge_name": {"bsonType": ["string","null"]},
                    "awarded_at": {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("badge_code", ASCENDING)]},
        ]
    },

    # ── 48. LEADERBOARD_PERIODS ──────────────────────────────────────────────
    "leaderboard_periods": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "period_type", "generated_at"],
                "properties": {
                    "tenant_id":     {"bsonType": "string"},
                    "period_type":   {"bsonType": "string", "enum": ["daily","weekly","monthly","all_time"]},
                    "start_date":    {"bsonType": ["string","null"]},
                    "end_date":      {"bsonType": ["string","null"]},
                    "rankings_json": {"bsonType": ["object","null"]},
                    "generated_at":  {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("period_type", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING), ("period_type", ASCENDING), ("start_date", ASCENDING)]},
        ]
    },

    # ── 49. INTEGRATION_WEBHOOKS ─────────────────────────────────────────────
    "integration_webhooks": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "provider", "target_url", "is_active", "created_at"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "name":             {"bsonType": "string"},
                    "provider":         {"bsonType": "string"},
                    "target_url":       {"bsonType": "string"},
                    "event_name":       {"bsonType": ["string","null"]},
                    "events":           {"bsonType": ["array","null"]},
                    "secret":           {"bsonType": ["string","null"]},
                    "headers_json":     {"bsonType": ["object","null"]},
                    "retry_policy":     {"bsonType": ["object","null"]},
                    "is_active":        {"bsonType": "bool"},
                    "last_triggered_at":{"bsonType": ["date","null"]},
                    "created_at":       {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("provider", ASCENDING)]},
            {"keys": [("is_active", ASCENDING)]},
        ]
    },

    # ── 50. WEBHOOK_DELIVERY_LOGS ────────────────────────────────────────────
    "webhook_delivery_logs": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["webhook_id", "tenant_id", "delivered_at"],
                "properties": {
                    "webhook_id":      {"bsonType": "string"},
                    "tenant_id":       {"bsonType": "string"},
                    "event_type":      {"bsonType": ["string","null"]},
                    "payload_json":    {"bsonType": ["object","null"]},
                    "response_status": {"bsonType": ["int","null"]},
                    "response_body":   {"bsonType": ["string","null"]},
                    "attempt_number":  {"bsonType": ["int","null"]},
                    "error":           {"bsonType": ["string","null"]},
                    "delivered_at":    {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("webhook_id", ASCENDING)]},
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("delivered_at", DESCENDING)]},
        ]
    },

    # ── 51. EXTERNAL_INTEGRATIONS ────────────────────────────────────────────
    "external_integrations": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "integration_type", "name", "status", "created_at"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "integration_type": {"bsonType": "string"},
                    "name":             {"bsonType": "string"},
                    "config_json":      {"bsonType": ["object","null"]},
                    "status":           {"bsonType": "string", "enum": ["active","inactive","error"]},
                    "last_synced_at":   {"bsonType": ["date","null"]},
                    "created_at":       {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("integration_type", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
        ]
    },

    # ── 52. LEAVE_TYPES ──────────────────────────────────────────────────────
    "leave_types": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "name", "created_at"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "name":             {"bsonType": "string"},
                    "days_allowed":     {"bsonType": ["int","null"]},
                    "carry_forward":    {"bsonType": ["bool","null"]},
                    "requires_approval":{"bsonType": ["bool","null"]},
                    "created_at":       {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
        ]
    },

    # ── 53. ATTENDANCE_RECORDS ───────────────────────────────────────────────
    "attendance_records": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "date", "status", "created_at"],
                "properties": {
                    "tenant_id":      {"bsonType": "string"},
                    "user_id":        {"bsonType": "string"},
                    "date":           {"bsonType": "string"},
                    "status":         {"bsonType": "string", "enum": ["present","absent","late","on_leave"]},
                    "check_in_time":  {"bsonType": ["string","null"]},
                    "check_out_time": {"bsonType": ["string","null"]},
                    "location":       {"bsonType": ["string","null"]},
                    "notes":          {"bsonType": ["string","null"]},
                    "created_at":     {"bsonType": "date"}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("date", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
            {"keys": [("user_id", ASCENDING), ("date", ASCENDING)], "unique": True},
        ]
    },

    # ── 54. LEAVE_REQUESTS ───────────────────────────────────────────────────
    "leave_requests": {
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["tenant_id", "user_id", "status", "applied_at"],
                "properties": {
                    "tenant_id":        {"bsonType": "string"},
                    "user_id":          {"bsonType": "string"},
                    "leave_type_id":    {"bsonType": ["string","null"]},
                    "leave_type":       {"bsonType": ["string","null"]},
                    "start_date":       {"bsonType": ["string","null"]},
                    "end_date":         {"bsonType": ["string","null"]},
                    "days_count":       {"bsonType": ["int","null"]},
                    "reason":           {"bsonType": ["string","null"]},
                    "status":           {"bsonType": "string", "enum": ["pending","approved","rejected"]},
                    "rejection_reason": {"bsonType": ["string","null"]},
                    "manager_comment":  {"bsonType": ["string","null"]},
                    "applied_at":       {"bsonType": "date"},
                    "reviewed_at":      {"bsonType": ["date","null"]},
                    "reviewed_by_id":   {"bsonType": ["string","null"]}
                }
            }
        },
        "indexes": [
            {"keys": [("tenant_id", ASCENDING)]},
            {"keys": [("user_id", ASCENDING)]},
            {"keys": [("status", ASCENDING)]},
        ]
    },
}


# ─────────────────────────────────────────────
# Main setup function
# ─────────────────────────────────────────────

def setup_database():
    print(f"\n{'='*60}")
    print(f"  MongoDB Atlas Setup — AI LMS Database")
    print(f"{'='*60}")
    print(f"  Connecting to Atlas...")

    try:
        client = MongoClient(CONNECTION_STRING, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        print(f"  Connected successfully!\n")
    except Exception as e:
        print(f"  ERROR: Could not connect — {e}")
        sys.exit(1)

    db = client[DB_NAME]
    existing = set(db.list_collection_names())

    created = 0
    updated = 0
    skipped = 0
    index_count = 0
    errors = []

    for name, config in COLLECTIONS.items():
        try:
            validator = config.get("validator", {})
            indexes   = config.get("indexes", [])

            if name not in existing:
                db.create_collection(name, validator=validator, validationLevel="moderate", validationAction="warn")
                print(f"  [CREATED]  {name}")
                created += 1
            else:
                # Update validator on existing collection
                db.command("collMod", name, validator=validator, validationLevel="moderate", validationAction="warn")
                print(f"  [UPDATED]  {name}")
                updated += 1

            # Create indexes
            col = db[name]
            for idx in indexes:
                keys      = idx["keys"]
                unique    = idx.get("unique", False)
                sparse    = idx.get("sparse", False)
                expire    = idx.get("expireAfterSeconds", None)

                kwargs = {"background": True}
                if unique:
                    kwargs["unique"] = True
                if sparse:
                    kwargs["sparse"] = True
                if expire is not None:
                    kwargs["expireAfterSeconds"] = expire

                col.create_index(keys, **kwargs)
                index_count += 1

        except CollectionInvalid as e:
            msg = f"  [ERROR]    {name}: {e}"
            print(msg)
            errors.append(msg)
        except OperationFailure as e:
            msg = f"  [ERROR]    {name}: {e}"
            print(msg)
            errors.append(msg)

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Database   : {DB_NAME}")
    print(f"  Created    : {created} collections")
    print(f"  Updated    : {updated} collections")
    print(f"  Indexes    : {index_count} created/verified")
    if errors:
        print(f"  Errors     : {len(errors)}")
        for e in errors:
            print(f"    {e}")
    else:
        print(f"  Errors     : 0")
    print(f"{'='*60}\n")

    client.close()


if __name__ == "__main__":
    setup_database()
