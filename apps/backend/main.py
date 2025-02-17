from fastapi import FastAPI

from database import lifespan
from routers import ai, fetching, goals

app = FastAPI(lifespan=lifespan)

# app.include_router(ai.router, prefix="/ai")
# app.include_router(goals.router)
app.include_router(fetching.router)


@app.get("/")
def read_root():
    return {"message": "Hello from Backend"}
