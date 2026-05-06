from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file so it works regardless of cwd
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8")

    # Example: postgresql+psycopg2://user:pass@localhost:5432/db
    DATABASE_URL: str = "postgresql+psycopg2://ai_lms:ai_lms_password@localhost:5432/ai_lms_db"

    JWT_SECRET: str = "dev_only_secret_change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_TTL_SECONDS: int = 3600

    # Frontend dev server origin(s)
    CORS_ORIGINS: str = "*"

    # Phase 3 AI provider settings
    AI_PROVIDER: str = "groq"
    AI_MODEL: str = "llama-3.1-8b-instant"
    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://api.groq.com/openai/v1"

    # MongoDB Atlas
    MONGODB_URL: str = "mongodb://localhost:27017"

    # SMTP / email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # Phase 2 async processing
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    JOB_POLL_INTERVAL_MS: int = 2000


settings = Settings()

