from asyncpg import Connection


async def ensure_user_row(conn: Connection, user_id: str) -> None:
    """Make sure the signed-in user has a row in public.user.

    Rows are normally created when the profile is first saved in Settings
    (/user/initialize), so users who go straight to planning (e.g. after a
    Google sign-in) have none. Tables with a foreign key to user (goal_draft,
    shared_tmpl) need it. No-op if the row already exists.
    """
    await conn.execute(
        "INSERT INTO public.user (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", user_id
    )
