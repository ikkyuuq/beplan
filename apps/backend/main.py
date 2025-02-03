from fastapi import FastAPI
from routers import ai, goals

app = FastAPI()

app.include_router(ai.router)
app.include_router(goals.router)

@app.get("/")
def read_root():
    return {"message": "Hello from Backend"}
