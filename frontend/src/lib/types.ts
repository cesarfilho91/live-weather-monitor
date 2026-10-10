export interface City {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

export interface CurrentWeather {
  city: City;
  temperature_c: number;
  feels_like_c: number;
  relative_humidity: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  weather_code: number;
  is_day: boolean;
  observed_at: string;
}

export interface WeatherSnapshot {
  items: CurrentWeather[];
  updated_at: string | null;
  stale: boolean;
  source: string;
}
