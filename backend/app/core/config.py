from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RAG Lab API"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    app_cors_origins: str = "http://localhost:3000"
    embedding_provider: str = "tfidf"
    embedding_model: str = "all-MiniLM-L6-v2"
    llm_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    groq_temperature: float = 1.0
    groq_top_p: float = 1.0
    groq_max_completion_tokens: int = 2048
    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.app_cors_origins.split(",") if origin.strip()]


settings = Settings()
