import asyncio
from io import BytesIO
from unittest.mock import Mock

import pytest
from botocore.exceptions import NoCredentialsError
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from backend import s3


def make_upload_file(filename="photo.png", content=b"image-bytes"):
    return UploadFile(
        BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": "image/png"}),
    )


def test_upload_image_puts_file_in_configured_bucket(monkeypatch):
    client = Mock()
    monkeypatch.setattr(s3, "s3", client)
    monkeypatch.setattr(s3.S3C, "BUCKET_NAME", "bucket")
    monkeypatch.setattr(s3.S3C, "REGION", "ap-southeast-1")

    result = asyncio.run(s3.upload_image(make_upload_file()))

    assert result == {
        "filename": "photo.png",
        "url": "https://bucket.s3.ap-southeast-1.amazonaws.com/photo.png",
        "status": "uploaded",
    }
    client.put_object.assert_called_once_with(
        Bucket="bucket",
        Key="photo.png",
        Body=b"image-bytes",
        ContentType="image/png",
        ACL="public-read",
    )


def test_upload_image_translates_missing_credentials_to_http_error(monkeypatch):
    client = Mock()
    client.put_object.side_effect = NoCredentialsError(error_msg="missing")
    monkeypatch.setattr(s3, "s3", client)

    with pytest.raises(HTTPException) as error:
        asyncio.run(s3.upload_image(make_upload_file()))

    assert error.value.status_code == 500
    assert error.value.detail == "AWS credentials not found"
