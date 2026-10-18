from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user_id
from database import lifespan
from routers import ai, analysis, drafts, goals, reschedule, template, user

app = FastAPI(lifespan=lifespan)

# Allow all origins for development
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Lets the web app read the code it translates AI errors from.
    expose_headers=["X-Error-Code"],
)

# Every route in these routers requires a valid Clerk session token.
authenticated = [Depends(get_current_user_id)]

app.include_router(ai.router, prefix="/api/v1/ai", dependencies=authenticated)
app.include_router(goals.router, prefix="/api/v1/goal", dependencies=authenticated)
app.include_router(drafts.router, prefix="/api/v1/drafts", dependencies=authenticated)
app.include_router(
    reschedule.router, prefix="/api/v1/reschedule", dependencies=authenticated
)
# Template auth is per-route: shared links stay public, BePlan templates need admin.
app.include_router(template.router, prefix="/api/v1/template")
app.include_router(
    analysis.router, prefix="/api/v1/analysis", dependencies=authenticated
)
app.include_router(user.router, prefix="/api/v1/user", dependencies=authenticated)


@app.get("/get")
def read_root():
    return {"message": "Hello from Backend"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.put("/update")
def delete_root():
    return {"message": "this is update methods"}
