import { Droplets, MapPin, Wind } from 'lucide-react';
import type { CurrentWeather } from '../lib/types';
import { weatherDescription, weatherIcon } from '../lib/weather';

interface WeatherCardProps {
  weather: CurrentWeather;
  featured?: boolean;
}

export function WeatherCard({ weather, featured = false }: WeatherCardProps) {
  return (
    <article className={`weather-card${featured ? ' weather-card--featured' : ''}`}>
      <div className="card-topline">
        <div className="city-label"><MapPin size={14} strokeWidth={1.8} />
          <span>{weather.city.name}</span><span className="region-tag">{weather.city.region}</span>
        </div>
        <span className="weather-symbol" aria-hidden="true">{weatherIcon(weather.weather_code)}</span>
      </div>
      <div className="temperature-row">
        <strong>{Math.round(weather.temperature_c)}°</strong>
        <div className="condition-copy">
          <span>{weatherDescription(weather.weather_code)}</span>
          <small>Sensação de {Math.round(weather.feels_like_c)}°C</small>
        </div>
      </div>
      <div className="card-divider" />
      <div className="weather-metrics">
        <div><Droplets size={15} /><span>Umidade</span><strong>{weather.relative_humidity}%</strong></div>
        <div><Wind size={15} /><span>Vento</span><strong>{Math.round(weather.wind_speed_kmh)} <small>km/h</small></strong></div>
      </div>
    </article>
  );
}
