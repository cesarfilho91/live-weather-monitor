from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.weather_service import CITIES, WeatherService


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cities_endpoint_returns_supported_locations() -> None:
    client = TestClient(app)
    response = client.get("/api/cities")
    assert response.status_code == 200
    assert {city["id"] for city in response.json()} >= {"curitiba", "sao-paulo"}


def test_empty_weather_snapshot_is_valid() -> None:
    service = WeatherService()
    snapshot = service.snapshot
    assert snapshot.items == []
    assert snapshot.stale is False


class FakeResponse:
    status_code = 200
    headers: dict[str, str] = {}

    def raise_for_status(self) -> None:
        return None

    def json(self) -> list[dict[str, object]]:
        return [
            {
                "current": {
                    "temperature_2m": 21.4,
                    "relative_humidity_2m": 65,
                    "apparent_temperature": 22.0,
                    "precipitation": 0.1,
                    "weather_code": 2,
                    "wind_speed_10m": 11.0,
                    "is_day": 1,
                    "time": datetime.now(UTC).replace(tzinfo=None).isoformat(timespec="minutes"),
                }
            }
            for _ in CITIES
        ]


class FakeClient:
    async def get(self, url: str, params: dict[str, object]) -> FakeResponse:
        assert "open-meteo.com" in url
        assert "latitude" in params
        return FakeResponse()


@pytest.mark.asyncio
async def test_refresh_populates_snapshot_and_notifies_subscribers() -> None:
    service = WeatherService()
    queue = service.subscribe()

    snapshot = await service.refresh(client=FakeClient())  # type: ignore[arg-type]

    assert len(snapshot.items) == len(CITIES)
    assert snapshot.stale is False
    assert snapshot.items[0].temperature_c == 21.4
    assert (await queue.get()).items[0].city.id == CITIES[0].id
    service.unsubscribe(queue)
