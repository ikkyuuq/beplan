from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import Header


def resolve_client_today(
    local_date: Optional[str], server_today: Optional[date] = None
) -> date:
    """The caller's local calendar date.

    The mobile app sends its device date in the ``X-Local-Date`` header. Real
    timezones are at most one calendar day away from UTC, so a value outside
    UTC-date +/- 1 day (wrong phone clock, missing or malformed header) falls
    back to UTC-date - 1: the earliest date anyone could still be living in,
    so overdue handling is late rather than early.
    """
    server_today = server_today or datetime.now(timezone.utc).date()
    fallback = server_today - timedelta(days=1)
    if not local_date:
        return fallback
    try:
        parsed = date.fromisoformat(local_date)
    except ValueError:
        return fallback
    if abs((parsed - server_today).days) > 1:
        return fallback
    return parsed


async def get_client_today(
    x_local_date: Optional[str] = Header(default=None),
) -> date:
    """FastAPI dependency wrapping :func:`resolve_client_today`."""
    return resolve_client_today(x_local_date)
