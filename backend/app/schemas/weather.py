from datetime import datetime

from pydantic import BaseModel, Field


class City(BaseModel):
    id: str
    name: str
    region: str
    latitude: float
    longitude: float


class CurrentWeather(BaseModel):
    city: City
    temperature_c: float
    feels_like_c: float
    relative_humidity: int = Field(ge=0, le=100)
    apparent_temperature_c: float
    precipitation_mm: float
    wind_speed_kmh: float
    weather_code: int
    is_day: bool
    observed_at: datetime


class WeatherSnapshot(BaseModel):
    items: list[CurrentWeather]
    updated_at: datetime | None = None
    stale: bool = False
    source: str = "Open-Meteo"
