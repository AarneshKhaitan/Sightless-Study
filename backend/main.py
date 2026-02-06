from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import documents, explore, modules, qa, voice
from services.demo_store import load_demo_data
from services.ai_provider import init_ai_provider

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_demo_data()
    init_ai_provider()
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
app.include_router(voice.router)
