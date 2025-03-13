import os
from typing import Any, Optional

from boto3.session import NoCredentialsError, Session
from clerk_backend_api import Clerk
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from database import get_db_pool

router = APIRouter()


class User(BaseModel):
    imageUrl: Optional[str] = None
    user_id: str
    username: str
    occupation: Optional[str] = None
    about: Optional[str] = None


ACCESS_KEY = os.environ.get("AWS_BUCKET_ACCESS_KEY_ID")
SECRET_KEY = os.environ.get("AWS_BUCKET_SECRET_ACCESS_KEY")
REGION = os.environ.get("AWS_BUCKET_REGION")
BUCKET_NAME = os.environ.get("AWS_BUCKET_NAME")

session = Session(
    aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY, region_name=REGION
)

s3 = session.client("s3")


@router.post("/upload_image")
async def upload_image(file: UploadFile = File(...)):
    try:
        file_content = await file.read()

        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=file.filename,
            Body=file_content,
            ContentType=file.content_type,
            ACL="public-read",
        )

        s3_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{file.filename}"

        return {"filename": file.filename, "url": s3_url, "status": "uploaded"}

    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not found")


@router.post("/initialize")
async def initialize(req: User):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO public.user (id, username, occupation, about) 
                      VALUES ($1, $2, $3, $4)
                    """,
                    req.user_id,
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
async def update(req: User):
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
                    req.user_id,
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
