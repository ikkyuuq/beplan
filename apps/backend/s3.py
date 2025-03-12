import os

from boto3.session import Session

ACCESS_KEY = os.environ.get("AWS_BUCKET_ACCESS_KEY_ID")
SECRET_KEY = os.environ.get("AWS_BUCKET_SECRET_ACCESS_KEY")
REGION = os.environ.get("AWS_BUCKET_REGION")
BUCKET_NAME = os.environ.get("AWS_BUCKET_NAME")

session = Session(
    aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY, region_name=REGION
)

s3 = session.client("s3")


def upload_file(file_name, bucket=BUCKET_NAME, object_name=None):
    if object_name is None:
        object_name = file_name

    try:
        s3.upload_file(file_name, bucket, object_name)
    except Exception as e:
        print(e)
        return False
    return True


def read_file(bucket=BUCKET_NAME, object_name=None):
    try:
        response = s3.get_object(Bucket=bucket, Key=object_name)
        return response["Body"].read()
    except Exception as e:
        print(e)
        return False
