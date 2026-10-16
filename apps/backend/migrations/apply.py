"""Apply pending SQL migrations in this folder, in filename order.

Usage (from apps/backend):  python migrations/apply.py
Reads DATABASE_URL from the environment (or .env / ../../docker/.env, like the
app). Each file runs in its own transaction and is recorded in
public.schema_migrations, so running this again only applies new files.
Add new migrations as NNN_description.sql.
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent


async def main() -> int:
    load_dotenv(HERE.parent / ".env")
    load_dotenv(HERE.parents[2] / "docker" / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 1

    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )
        applied = {r["name"] for r in await conn.fetch("SELECT name FROM public.schema_migrations")}
        pending = [p for p in sorted(HERE.glob("*.sql")) if p.name not in applied]
        if not pending:
            print("No pending migrations.")
        for path in pending:
            async with conn.transaction():
                await conn.execute(path.read_text(encoding="utf-8"))
                await conn.execute(
                    "INSERT INTO public.schema_migrations (name) VALUES ($1)", path.name
                )
            print(f"Applied {path.name}")
    finally:
        await conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
