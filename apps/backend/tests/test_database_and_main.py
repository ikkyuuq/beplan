import asyncio
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from backend import database
from backend.main import app


def test_root_and_health_endpoints_return_expected_payloads():
    client = TestClient(app)

    assert client.get("/get").json() == {"message": "Hello from Backend"}
    assert client.get("/health").json() == {"status": "ok"}
    assert client.put("/update").json() == {"message": "this is update methods"}


def test_init_db_creates_pool_without_statement_cache():
    pool = object()
    create_pool = AsyncMock(return_value=pool)

    with patch.object(database.asyncpg, "create_pool", create_pool):
        asyncio.run(database.init_db())

    assert database.db_pool is pool
    create_pool.assert_awaited_once_with(database.DATABASE_URL, statement_cache_size=0)


def test_get_db_pool_returns_current_pool():
    pool = object()
    database.db_pool = pool

    assert asyncio.run(database.get_db_pool()) is pool


def test_database_helpers_are_safe_before_startup():
    database.db_pool = None

    assert asyncio.run(database.get_db_pool()) is None
    asyncio.run(database.close_db())


def test_close_db_closes_current_pool():
    pool = AsyncMock()
    database.db_pool = pool

    asyncio.run(database.close_db())

    pool.close.assert_awaited_once_with()


def test_lifespan_initializes_and_closes_database_pool():
    init_db = AsyncMock()
    close_db = AsyncMock()

    with patch.object(database, "init_db", init_db), patch.object(
        database, "close_db", close_db
    ):
        async def exercise_lifespan():
            async with database.lifespan(app):
                assert init_db.await_count == 1
                assert close_db.await_count == 0

        asyncio.run(exercise_lifespan())

    close_db.assert_awaited_once_with()
