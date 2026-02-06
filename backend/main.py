from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, explore, modules, qa
from services.demo_store import load_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_demo_data()
    yield


app = FastAPI(title="GuidedNotes API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(modules.router)
app.include_router(qa.router)
app.include_router(explore.router)
