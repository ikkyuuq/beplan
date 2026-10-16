import os
from contextlib import asynccontextmanager
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()
project_root = Path(__file__).resolve().parents[2] if len(Path(__file__).resolve().parents) > 2 else None
if project_root:
    docker_env = project_root / "docker" / ".env"
    if docker_env.exists():
        load_dotenv(docker_env)

DATABASE_URL = os.getenv("DATABASE_URL")

# Connection pool variable.  Keeping an explicit empty state makes the
# shutdown and dependency helpers safe before application startup.
db_pool: asyncpg.Pool | None = None


async def init_db():
    """Initialize the connection pool"""
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, statement_cache_size=0)


async def close_db():
    """Close the connection pool"""
    if db_pool is not None:
        await db_pool.close()


async def get_db_pool():
    """Get the database pool instance"""
    if db_pool is not None:
        return db_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database connections"""
    await init_db()
    yield
    await close_db()