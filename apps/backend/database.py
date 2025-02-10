import os
from contextlib import asynccontextmanager

import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# Connection pool variable
db_pool: asyncpg.Pool


async def init_db():
    """Initialize the connection pool"""
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)


async def close_db():
    """Close the connection pool"""
    if db_pool is not None:
        await db_pool.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database connections"""
    await init_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)


async def fetch_current_time():
    """Fetch current time from database"""
    if db_pool is not None:
        async with db_pool.acquire() as conn:
            return await conn.fetchval("SELECT NOW();")


@app.get("/time")
async def get_time():
    """API route to fetch time"""
    time = await fetch_current_time()
    return {"current_time": time}
