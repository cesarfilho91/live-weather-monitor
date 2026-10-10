import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.weather_service import WeatherService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


async def refresh_loop(service: WeatherService) -> None:
    while True:
        try:
            await service.refresh()
        except Exception:
            logger.exception("Unexpected error while refreshing weather data")
        await asyncio.sleep(max(15, settings.refresh_interval_seconds))


@asynccontextmanager
async def lifespan(app: FastAPI):
    service = WeatherService(timeout_seconds=settings.request_timeout_seconds)
    app.state.weather_service = service
    task = asyncio.create_task(refresh_loop(service), name="weather-refresh-loop")
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title=settings.app_name,
    description="Weather data API with cached snapshots and Server-Sent Events.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)
