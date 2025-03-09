from fastapi import FastAPI

from database import lifespan
from routers import ai, analysis, goals, fetching, template ,reschedule

app = FastAPI(lifespan=lifespan)

app.include_router(ai.router, prefix="/ai")
app.include_router(goals.router)
app.include_router(fetching.router)
app.include_router(reschedule.router)
app.include_router(template.router, prefix="/template")
app.include_router(analysis.router, prefix="/analysis")

@app.get("/get")
def read_root():
    return {"message": "Hello from Backend"}


@app.put("/update")
def delete_root():
    return {"message": "this is update methods"}
