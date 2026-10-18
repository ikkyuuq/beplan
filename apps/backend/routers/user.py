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


class ProfileUpdate(BaseModel):
    """Profile fields to change; fields left out (None) are not touched."""

    username: Optional[str] = None
    occupation: Optional[str] = None
    description: Optional[str] = None


USERNAME_PATTERN = re.compile(r"[A-Za-z0-9_]{3,20}")
MAX_OCCUPATION_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 300

# field -> (public.user column, Clerk unsafeMetadata key). Fixed names only,
# so building the SQL from them is safe.
PROFILE_FIELDS = {
    "username": ("username", "appUsername"),
    "occupation": ("occupation", "occupation"),
    "description": ("about", "description"),
}


@router.put("/profile")
async def update_profile(
    req: ProfileUpdate, user_id: str = Depends(get_current_user_id)
):
    """Save profile fields to the DB and to Clerk ``unsafeMetadata``.

    The app used to call Clerk's ``user.update()`` itself, which Clerk can
    refuse with "additional verification" (reverification), e.g. on web. The
    backend API with the secret key isn't subject to that.
    """
    values = {
        field: value.strip()
        for field, value in req.model_dump().items()
        if value is not None
    }
    if not values:
        raise HTTPException(status_code=422, detail="Nothing to update.")
    if "username" in values and not USERNAME_PATTERN.fullmatch(values["username"]):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
        )
    if len(values.get("occupation", "")) > MAX_OCCUPATION_LENGTH:
        raise HTTPException(status_code=422, detail="Occupation is too long.")
    if len(values.get("description", "")) > MAX_DESCRIPTION_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Description must be at most {MAX_DESCRIPTION_LENGTH} characters.",
        )

    columns = [PROFILE_FIELDS[field][0] for field in values]
    placeholders = ", ".join(f"${i}" for i in range(2, len(columns) + 2))
    updates = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns)
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            f"""
            INSERT INTO public.user (id, {", ".join(columns)}) VALUES ($1, {placeholders})
            ON CONFLICT (id) DO UPDATE SET {updates}
            """,
            user_id,
            *values.values(),
        )
    await merge_unsafe_metadata(
        user_id, {PROFILE_FIELDS[field][1]: value for field, value in values.items()}
    )
    return values


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
