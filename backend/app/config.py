from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://mcpguard:mcpguard@db:5432/mcpguard"
    secret_key: str = "dev-secret"
    github_token: str = ""
    scan_interval_hours: int = 6

    class Config:
        env_file = ".env"


settings = Settings()
