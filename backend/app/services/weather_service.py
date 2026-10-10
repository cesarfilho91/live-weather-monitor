import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.schemas.weather import City, CurrentWeather, WeatherSnapshot

logger = logging.getLogger(__name__)

CITIES = [
    City(id="curitiba", name="Curitiba", region="PR", latitude=-25.4284, longitude=-49.2733),
    City(id="sao-paulo", name="São Paulo", region="SP", latitude=-23.5505, longitude=-46.6333),
    
    City(
        id="rio-de-janeiro",
        name="Rio de Janeiro",
        region="RJ",
        latitude=-22.9068,
        longitude=-43.1729,
    ),
    City(
        id="porto-alegre",
        name="Porto Alegre",
        region="RS",
        latitude=-30.0346,
        longitude=-51.2177,
    ),
    City(id="recife", name="Recife", region="PE", latitude=-8.0476, longitude=-34.8770),
]

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
CURRENT_FIELDS = (
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
    "weather_code,wind_speed_10m,is_day"
)


class WeatherService:
    def __init__(self, timeout_seconds: float = 8.0) -> None:
        self._timeout_seconds = timeout_seconds
        self._snapshot = WeatherSnapshot(items=[])
        self._lock = asyncio.Lock()
        self._subscribers: set[asyncio.Queue[WeatherSnapshot]] = set()

    @property
    def snapshot(self) -> WeatherSnapshot:
        return self._snapshot.model_copy(deep=True)

    async def refresh(self, client: httpx.AsyncClient | None = None) -> WeatherSnapshot:
        owns_client = client is None
        http_client = client or httpx.AsyncClient(timeout=self._timeout_seconds)
        try:
            responses = await asyncio.gather(
                *(self._fetch_city(http_client, city) for city in CITIES),
                return_exceptions=True,
            )
            for result in responses:
                if isinstance(result, Exception):
                    logger.warning("A city weather request failed: %s", result)
            fresh_by_id = {
                item.city.id: item
                for item in responses
                if isinstance(item, CurrentWeather)
            }
            async with self._lock:
                previous_by_id = {item.city.id: item for item in self._snapshot.items}
                merged = [fresh_by_id.get(city.id, previous_by_id.get(city.id)) for city in CITIES]
                items = [item for item in merged if item is not None]
                if not items:
                    logger.warning("Weather refresh failed; no cached observations available")
                    self._snapshot = self._snapshot.model_copy(update={"stale": True}, deep=True)
                    return self._snapshot.model_copy(deep=True)
                updated_at = datetime.now(UTC)
                stale = len(fresh_by_id) != len(CITIES)
                self._snapshot = WeatherSnapshot(items=items, updated_at=updated_at, stale=stale)
                published = self._snapshot.model_copy(deep=True)
            self._publish(published)
            return published
        finally:
            if owns_client:
                await http_client.aclose()

    async def _fetch_city(self, client: httpx.AsyncClient, city: City) -> CurrentWeather:
        response = await client.get(
            WEATHER_URL,
            params={
                "latitude": city.latitude,
                "longitude": city.longitude,
                "current": CURRENT_FIELDS,
                "timezone": "auto",
            },
        )
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
        current = payload["current"]
        return CurrentWeather(
            city=city,
            temperature_c=current["temperature_2m"],
            feels_like_c=current["apparent_temperature"],
            relative_humidity=current["relative_humidity_2m"],
            apparent_temperature_c=current["apparent_temperature"],
            precipitation_mm=current["precipitation"],
            wind_speed_kmh=current["wind_speed_10m"],
            weather_code=current["weather_code"],
            is_day=bool(current["is_day"]),
            observed_at=datetime.fromisoformat(current["time"]),
        )

    def subscribe(self) -> asyncio.Queue[WeatherSnapshot]:
        queue: asyncio.Queue[WeatherSnapshot] = asyncio.Queue(maxsize=1)
        self._subscribers.add(queue)
        if self._snapshot.items:
            queue.put_nowait(self.snapshot)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[WeatherSnapshot]) -> None:
        self._subscribers.discard(queue)

    def _publish(self, snapshot: WeatherSnapshot) -> None:
        for queue in tuple(self._subscribers):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                queue.put_nowait(snapshot.model_copy(deep=True))
            except asyncio.QueueFull:
                logger.debug("Skipping update for a slow SSE subscriber")
