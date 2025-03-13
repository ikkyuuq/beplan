from boto3.session import NoCredentialsError, Session
from const import s3 as S3C
from fastapi import File, HTTPException, UploadFile

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
