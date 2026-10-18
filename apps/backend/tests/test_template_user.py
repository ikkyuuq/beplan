import asyncio
from datetime import date
from unittest.mock import AsyncMock, Mock

from backend.routers import template, user
from backend.routers.template import FavoriteTemplateRequest
from backend.routers.user import User


class FakeConnection:
    def __init__(self):
        self.fetch = AsyncMock()
        self.fetchrow = AsyncMock()
        self.execute = AsyncMock()
        self.transaction = Mock(return_value=self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


class FakePool:
    def __init__(self, connection):
        self.connection = connection

    def acquire(self):
        return self.connection


def patch_pool(monkeypatch, module, connection):
    async def get_pool():
        return FakePool(connection)

    monkeypatch.setattr(module, "get_db_pool", get_pool)


def test_template_favorite_toggle_inserts_when_not_already_favorited(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = None
    patch_pool(monkeypatch, template, connection)

    result = asyncio.run(
        template.favorite_template(
            FavoriteTemplateRequest(template_id=7), user_id="user-1"
        )
    )

    assert result == {"message": "Template favorited"}
    assert "INSERT INTO public.favorite_template" in connection.execute.await_args.args[0]
    assert connection.execute.await_args.args[-2:] == ("user-1", 7)


def test_template_favorite_toggle_deletes_existing_favorite(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = {"template_id": 7}
    patch_pool(monkeypatch, template, connection)

    result = asyncio.run(
        template.favorite_template(
            FavoriteTemplateRequest(template_id=7), user_id="user-1"
        )
    )

    assert result == {"message": "Template unfavorited"}
    assert "DELETE FROM public.favorite_template" in connection.execute.await_args.args[0]
    assert connection.execute.await_args.args[-2:] == ("user-1", 7)


def test_fetch_template_joins_template_creator_goals_and_favorites(monkeypatch):
    connection = FakeConnection()
    connection.fetch.side_effect = [
        [
            {
                "id": 1,
                "title": "Starter plan",
                "description": "A plan",
                "image_url": "https://example.test/plan.png",
                "created_by": "user-1",
                "category": "health",
                "type": "template",
                "start_date": date(2026, 10, 1),
                "due_date": date(2026, 10, 3),
            }
        ],
        [{"template_id": 1}],
        [
            {
                "id": "user-1",
                "username": "Ada",
                "image": None,
                "occupation": "Engineer",
                "about": "Profile",
            }
        ],
        [{"id": 2, "template_id": 1, "goal_id": 3}],
        [{"id": 3, "title": "Exercise"}],
        [{"id": 4, "tmpl_goal_id": 2, "task_id": 5}],
        [
            {
                "id": 5,
                "title": "Walk",
                "description": "Take a walk",
                "type": "daily",
                "interval": None,
            }
        ],
        [{"template_id": 1}],
        [{"template_id": 1, "n": 4}],
    ]
    patch_pool(monkeypatch, template, connection)

    results = asyncio.run(template.fetch_template(user_id="user-1"))

    assert len(results) == 1
    assert results[0].id == 1
    assert results[0].created_by.username == "Ada"
    assert results[0].status == template.TemplateStatus.ASSIGNED
    assert results[0].is_favorite is True
    assert results[0].favorite_count == 4
    assert results[0].duration == 3
    assert results[0].goals[0].title == "Exercise"
    assert results[0].goals[0].tasks[0].title == "Walk"


def test_fetch_template_per_template_duration_category_and_official_creator(monkeypatch):
    def tmpl(id, created_by, category, days):
        return {
            "id": id,
            "title": f"Plan {id}",
            "description": None,
            "image_url": "",
            "created_by": created_by,
            "category": category,
            "type": "template",
            "start_date": date(2026, 10, 1),
            "due_date": date(2026, 10, days),
        }

    connection = FakeConnection()
    connection.fetch.side_effect = [
        [tmpl(1, "Beplan", "Workout", 7), tmpl(2, "ฺBeplan", "Personal Budgeting", 30)],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
    ]
    patch_pool(monkeypatch, template, connection)

    results = asyncio.run(template.fetch_template(user_id="user-1"))

    assert [r.duration for r in results] == [7, 30]
    assert [r.category for r in results] == ["workout", "finance"]
    assert [r.created_by.user_id for r in results] == ["BePlan", "BePlan"]
    assert [r.favorite_count for r in results] == [0, 0]


def test_is_official_creator():
    for name in ["BePlan", "Beplan", "ฺBeplan", " beplan "]:
        assert template.is_official_creator(name)
    for name in [None, "", "user_2uHz", "BePlanner"]:
        assert not template.is_official_creator(name)


def test_user_initialize_persists_profile_fields(monkeypatch):
    connection = FakeConnection()
    patch_pool(monkeypatch, user, connection)

    result = asyncio.run(
        user.initialize(
            User(
                username="Ada",
                occupation="Engineer",
                about="Profile",
            ),
            user_id="user-1",
        )
    )

    assert result == {"status": "success"}
    assert "INSERT INTO public.user" in connection.execute.await_args.args[0]
    assert connection.execute.await_args.args[-4:] == (
        "user-1",
        "Ada",
        "Engineer",
        "Profile",
    )


def test_user_update_persists_image_and_profile_fields(monkeypatch):
    connection = FakeConnection()
    patch_pool(monkeypatch, user, connection)

    result = asyncio.run(
        user.update(
            User(
                user_id="spoofed-user",
                imageUrl="https://example.test/avatar.png",
                username="Ada",
                occupation="Engineer",
                about="Profile",
            ),
            user_id="user-1",
        )
    )

    assert result == {"status": "success"}
    assert "UPDATE public.user" in connection.execute.await_args.args[0]
    assert connection.execute.await_args.args[-5:] == (
        "user-1",
        "https://example.test/avatar.png",
        "Ada",
        "Engineer",
        "Profile",
    )


def test_update_profile_saves_given_fields_to_db_and_clerk(monkeypatch):
    connection = FakeConnection()
    patch_pool(monkeypatch, user, connection)
    merge = AsyncMock()
    monkeypatch.setattr(user, "merge_unsafe_metadata", merge)

    result = asyncio.run(
        user.update_profile(
            user.ProfileUpdate(username=" ada_99 ", description="Hi"),
            user_id="user-1",
        )
    )

    assert result == {"username": "ada_99", "description": "Hi"}
    sql = " ".join(connection.execute.await_args.args[0].split())
    assert "(id, username, about) VALUES ($1, $2, $3)" in sql
    assert "occupation" not in sql
    assert connection.execute.await_args.args[1:] == ("user-1", "ada_99", "Hi")
    merge.assert_awaited_once_with(
        "user-1", {"appUsername": "ada_99", "description": "Hi"}
    )


def test_update_profile_allows_clearing_a_field(monkeypatch):
    connection = FakeConnection()
    patch_pool(monkeypatch, user, connection)
    merge = AsyncMock()
    monkeypatch.setattr(user, "merge_unsafe_metadata", merge)

    asyncio.run(user.update_profile(user.ProfileUpdate(occupation=""), user_id="user-1"))

    merge.assert_awaited_once_with("user-1", {"occupation": ""})


def test_update_profile_rejects_invalid_input(monkeypatch):
    import pytest
    from fastapi import HTTPException

    connection = FakeConnection()
    patch_pool(monkeypatch, user, connection)
    merge = AsyncMock()
    monkeypatch.setattr(user, "merge_unsafe_metadata", merge)

    bad_requests = [
        user.ProfileUpdate(),
        *(user.ProfileUpdate(username=bad) for bad in ["ab", "has space", "x" * 21, "émile"]),
        user.ProfileUpdate(description="x" * 301),
        user.ProfileUpdate(occupation="x" * 101),
    ]
    for request in bad_requests:
        with pytest.raises(HTTPException) as error:
            asyncio.run(user.update_profile(request, user_id="user-1"))
        assert error.value.status_code == 422
    connection.execute.assert_not_awaited()
    merge.assert_not_awaited()
