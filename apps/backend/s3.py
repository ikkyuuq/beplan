import os
import re
import uuid
from typing import Optional

from boto3.session import NoCredentialsError, Session
from const import s3 as S3C
from fastapi import File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

session = Session(
    aws_access_key_id=S3C.ACCESS_KEY,
    aws_secret_access_key=S3C.SECRET_KEY,
    region_name=S3C.REGION,
)

s3 = session.client("s3")


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


def make_object_key(prefix: str, user_id: str, filename: Optional[str]) -> str:
    """Unique S3 key so uploads never overwrite another user's file."""
    ext = os.path.splitext(filename or "")[1].lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,10}", ext):
        ext = ""
    return f"{prefix}/{user_id}/{uuid.uuid4().hex}{ext}"


async def upload_public_file(file: UploadFile, key: str) -> dict:
    """Upload ``file`` under ``key`` with public-read and return its URL."""
    try:
        await run_in_threadpool(
            s3.upload_fileobj,
            file.file,
            S3C.BUCKET_NAME,
            key,
            ExtraArgs={
                "ContentType": file.content_type or "application/octet-stream",
                "ACL": "public-read",
            },
        )
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not found")

    s3_url = f"https://{S3C.BUCKET_NAME}.s3.{S3C.REGION}.amazonaws.com/{key}"
    return {"filename": key, "url": s3_url, "status": "uploaded"}
