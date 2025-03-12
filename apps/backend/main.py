from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import lifespan
from routers import ai, analysis, goals, reschedule, template

app = FastAPI(lifespan=lifespan)

# Allow all origins for development
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router, prefix="/api/v1/ai")
app.include_router(goals.router, prefix="/api/v1/goal")
app.include_router(reschedule.router, prefix="/api/v1/reschedule")
app.include_router(template.router, prefix="/api/v1/template")
app.include_router(analysis.router, prefix="/api/v1/analysis")


@app.get("/get")
def read_root():
    return {"message": "Hello from Backend"}


@app.put("/update")
def delete_root():
    return {"message": "this is update methods"}
