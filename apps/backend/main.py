from fastapi import FastAPI
from routers import goals, ai

app = FastAPI()

app.include_router(ai.router, prefix="/ai")
app.include_router(goals.router)


@app.get("/")
def read_root():
    return {"message": "Hello from Backend"}
