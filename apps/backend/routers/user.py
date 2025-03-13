from typing import Optional

from boto3.session import NoCredentialsError
from const import s3 as S3C
from database import get_db_pool
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from s3 import s3

router = APIRouter()


class User(BaseModel):
    imageUrl: Optional[str] = None
    user_id: str
    username: Optional[str] = None
    occupation: Optional[str] = None
    about: Optional[str] = None


@router.post("/upload_image")
async def upload_image(file: UploadFile = File(...)):
    try:
        file_content = await file.read()

        s3.put_object(
            Bucket=S3C.BUCKET_NAME,
            Key=file.filename,
            Body=file_content,
            ContentType=file.content_type,
            ACL="public-read",
        )

        s3_url = (
            f"https://{S3C.BUCKET_NAME}.s3.{S3C.REGION}.amazonaws.com/{file.filename}"
        )

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
