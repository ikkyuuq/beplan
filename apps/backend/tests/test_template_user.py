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
    ]
    patch_pool(monkeypatch, template, connection)

    results = asyncio.run(template.fetch_template(user_id="user-1"))

    assert len(results) == 1
    assert results[0].id == 1
    assert results[0].created_by.username == "Ada"
    assert results[0].status == template.TemplateStatus.ASSIGNED
    assert results[0].is_favorite is True
    assert results[0].duration == 3
    assert results[0].goals[0].title == "Exercise"
    assert results[0].goals[0].tasks[0].title == "Walk"


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
