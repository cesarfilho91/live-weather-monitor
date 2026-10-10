import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, CloudSun, Radio, RefreshCw, Signal, Waves } from 'lucide-react';
import { WeatherCard } from './components/WeatherCard';
import { formatTime, getConditionSummary } from './lib/weather';
import type { WeatherSnapshot } from './lib/types';
import './styles/global.css';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export default function App() {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let active = true;

    async function loadInitialSnapshot() {
      try {
        const response = await fetch(`${API_BASE}/api/weather`);
        if (!response.ok) throw new Error('Não foi possível carregar a leitura inicial.');
        const data = (await response.json()) as WeatherSnapshot;
        if (active && data.items.length) setSnapshot(data);
      } catch {
        if (active) setError('Aguardando conexão com a API meteorológica.');
      }
    }

    void loadInitialSnapshot();
    source = new EventSource(`${API_BASE}/api/weather/stream`);
    source.addEventListener('weather', (event: MessageEvent<string>) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data) as WeatherSnapshot;
        setSnapshot(data);
        setLastEventAt(new Date().toISOString());
        setConnection('live');
        setError(null);
      } catch {
        setError('Recebemos uma atualização em formato inesperado.');
      }
    });
    source.onopen = () => { if (active) setConnection('live'); };
    source.onerror = () => { if (active) setConnection('reconnecting'); };

    return () => {
      active = false;
      source?.close();
    };
  }, []);

  const items = snapshot?.items ?? [];
  const featured = useMemo(() => items.find((item) => item.city.id === 'curitiba') ?? items[0], [items]);
  const warmest = useMemo(() => [...items].sort((a, b) => b.temperature_c - a.temperature_c)[0], [items]);
  const coolest = useMemo(() => [...items].sort((a, b) => a.temperature_c - b.temperature_c)[0], [items]);
  const average = items.length ? items.reduce((sum, item) => sum + item.temperature_c, 0) / items.length : null;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Atmos, início">
          <span className="brand-mark"><Waves size={22} strokeWidth={2.2} /></span>
          <span className="brand-name">atmos<span>.</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div className="side-section-label">WORKSPACE</div>
        <a className="side-link side-link--active" href="#overview"><Activity size={17} />Visão geral</a>
        <a className="side-link" href="#cities"><CloudSun size={17} />Cidades monitoradas</a>
        <div className="sidebar-bottom">
          <div className="api-status"><span className={`status-dot status-dot--${connection}`} />
            <div><strong>{connection === 'live' ? 'Sistema operacional' : connection === 'connecting' ? 'Conectando...' : 'Reconectando'}</strong>
              <small>Fluxo de eventos SSE</small></div>
          </div>
          <div className="sidebar-footnote">Dados públicos · Open-Meteo<br />Projeto de portfólio</div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Monitoramento</strong></div>
          <div className="topbar-right"><span className="live-pill"><span />LIVE DATA</span><span className="topbar-date">BRASIL · UTC−03</span></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" />CENTRAL DE MONITORAMENTO</div>
              <h1>Condições <span>agora.</span></h1>
              <p>Uma visão em tempo real do clima nas principais cidades brasileiras.</p></div>
            <div className="updated-block"><span className="updated-icon"><RefreshCw size={14} /></span>
              <div><small>ÚLTIMA ATUALIZAÇÃO</small><strong>{formatTime(snapshot?.updated_at ?? null)}</strong></div></div>
          </section>

          {error && <div className="notice" role="status">{error}</div>}

          <section className="summary-grid" aria-label="Indicadores gerais">
            <article className="summary-card summary-card--accent"><div className="summary-label">CIDADES ATIVAS <span><Signal size={15} /></span></div>
              <div className="summary-value">{items.length.toString().padStart(2, '0')}<small> / 05</small></div>
              <div className="summary-foot"><span className="tiny-bars"><i /><i /><i /><i /><i /><i /><i /></span><span>pontos monitorados</span></div></article>
            <article className="summary-card"><div className="summary-label">TEMPERATURA MÉDIA <span><Activity size={15} /></span></div>
              <div className="summary-value">{average === null ? '—' : `${average.toFixed(1).replace('.', ',')}°`}<small>C</small></div>
              <div className="summary-foot"><span className="metric-neutral"><ArrowUpRight size={13} /> Média regional</span></div></article>
            <article className="summary-card"><div className="summary-label">MAIOR TEMPERATURA <span><ArrowUpRight size={15} /></span></div>
              <div className="summary-value">{warmest ? `${Math.round(warmest.temperature_c)}°` : '—'}<small>C</small></div>
              <div className="summary-foot"><span className="metric-neutral">{warmest?.city.name ?? 'Sem leitura'}</span></div></article>
            <article className="summary-card"><div className="summary-label">MENOR TEMPERATURA <span><ArrowDownRight size={15} /></span></div>
              <div className="summary-value">{coolest ? `${Math.round(coolest.temperature_c)}°` : '—'}<small>C</small></div>
              <div className="summary-foot"><span className="metric-neutral">{coolest?.city.name ?? 'Sem leitura'}</span></div></article>
          </section>

          <section className="featured-section">
            <div className="section-heading"><div><span className="section-kicker">DESTAQUE</span><h2>Visão local</h2></div><span className="section-caption">{featured ? `${featured.city.name}, ${featured.city.region}` : 'Aguardando dados'}</span></div>
            {featured ? <div className="featured-card"><div className="featured-orb featured-orb--one" /><div className="featured-orb featured-orb--two" />
              <div className="featured-main"><span className="featured-overline">CONDIÇÃO ATUAL · {featured.city.name.toUpperCase()}</span>
                <div className="featured-temperature">{Math.round(featured.temperature_c)}<span>°C</span></div>
                <p>{getConditionSummary(items)}</p><div className="featured-location"><span className="location-pulse" />{featured.city.name}, {featured.city.region}, Brasil</div></div>
              <div className="featured-side"><div className="featured-weather-icon">☼</div><div className="featured-side-label">SENSAÇÃO TÉRMICA</div><strong>{Math.round(featured.feels_like_c)}°C</strong><div className="featured-side-divider" />
                <div className="featured-side-label">PRECIPITAÇÃO</div><strong>{featured.precipitation_mm.toLocaleString('pt-BR')} <small>mm</small></strong></div>
            </div> : <div className="empty-state"><RefreshCw size={20} /><span>Buscando as primeiras leituras meteorológicas...</span></div>}
          </section>

          <section className="cities-section" id="cities"><div className="section-heading"><div><span className="section-kicker">ACOMPANHAMENTO</span><h2>Rede de cidades</h2></div>
            <div className="cities-meta"><span className={`status-dot status-dot--${connection}`} />{connection === 'live' ? 'Conectado ao fluxo' : 'Conexão pendente'}<span className="meta-divider" />{items.length} de 5 locais</div></div>
            {items.length ? <div className="weather-grid">{items.map((weather) => <WeatherCard key={weather.city.id} weather={weather} featured={weather.city.id === 'curitiba'} />)}</div> : <div className="empty-state"><RefreshCw size={20} /><span>As cidades aparecerão aqui assim que a API responder.</span></div>}
          </section>

          <footer className="page-footer"><span>ATMOS <span className="footer-dot">·</span> LIVE WEATHER MONITOR</span><span><Radio size={13} /> {lastEventAt ? `Último evento recebido às ${formatTime(lastEventAt)}` : 'Aguardando primeiro evento SSE'}</span><span>Fonte: Open-Meteo API</span></footer>
        </div>
      </section>
    </main>
  );
}
