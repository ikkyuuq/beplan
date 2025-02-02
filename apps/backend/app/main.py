from fastapi import FastAPI
from routers import ai

app = FastAPI()

app.include_router(ai.router)

@app.get("/")
def read_root():
    return {"message": "Hello from Backend"}
