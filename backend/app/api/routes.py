import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.weather import WeatherSnapshot
from app.services.weather_service import CITIES, WeatherService

router = APIRouter(prefix="/api")


def get_service(request: Request) -> WeatherService:
    return request.app.state.weather_service


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/cities")
async def cities() -> list[dict[str, object]]:
    return [city.model_dump() for city in CITIES]


@router.get("/weather", response_model=WeatherSnapshot)
async def current_weather(request: Request) -> WeatherSnapshot:
    return get_service(request).snapshot


@router.get("/weather/stream")
async def weather_stream(request: Request) -> StreamingResponse:
    service = get_service(request)

    async def events() -> AsyncIterator[str]:
        queue = service.subscribe()
        try:
            yield "retry: 5000\n\n"
            while not await request.is_disconnected():
                try:
                    snapshot = await asyncio.wait_for(queue.get(), timeout=20)
                    data = json.dumps(snapshot.model_dump(mode="json"))
                    yield f"event: weather\ndata: {data}\n\n"
                except TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            service.unsubscribe(queue)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
