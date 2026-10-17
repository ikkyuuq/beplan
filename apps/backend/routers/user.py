import re
from typing import Optional

from auth import get_current_user_id, merge_unsafe_metadata
from database import get_db_pool
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from s3 import make_object_key, upload_public_file

router = APIRouter()


class User(BaseModel):
    imageUrl: Optional[str] = None
    user_id: Optional[str] = None  # ignored; taken from the auth token
    username: Optional[str] = None
    occupation: Optional[str] = None
    about: Optional[str] = None


class UsernameUpdate(BaseModel):
    username: str


USERNAME_PATTERN = re.compile(r"[A-Za-z0-9_]{3,20}")


@router.put("/username")
async def update_username(
    req: UsernameUpdate, user_id: str = Depends(get_current_user_id)
):
    """Set the app username in the DB and in Clerk ``unsafeMetadata.appUsername``."""
    username = req.username.strip()
    if not USERNAME_PATTERN.fullmatch(username):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
        )
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO public.user (id, username) VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
            """,
            user_id,
            username,
        )
    await merge_unsafe_metadata(user_id, {"appUsername": username})
    return {"username": username}


@router.post("/upload_image")
async def upload_image(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)
):
    key = make_object_key("users", user_id, file.filename)
    return await upload_public_file(file, key)


@router.post("/initialize")
async def initialize(req: User, user_id: str = Depends(get_current_user_id)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO public.user (id, username, occupation, about)
                      VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET
                      username = EXCLUDED.username,
                      occupation = EXCLUDED.occupation,
                      about = EXCLUDED.about
                    """,
                    user_id,
                    req.username,
                    req.occupation,
                    req.about,
                )
                return {"status": "success"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.put("/update")
async def update(req: User, user_id: str = Depends(get_current_user_id)):
    s3_url = req.imageUrl
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE public.user
                    SET image = $2, username = $3, occupation = $4, about = $5
                    WHERE id = $1
                    """,
                    user_id,
                    s3_url,
                    req.username,
                    req.occupation,
                    req.about,
                )

                return {"status": "success"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
