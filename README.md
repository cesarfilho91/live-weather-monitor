# Atmos — Live Weather Monitor

Painel meteorológico com atualizações em tempo real, construído com FastAPI, React e TypeScript. O backend consulta a API pública do Open-Meteo, mantém um snapshot em memória e distribui as atualizações para os clientes conectados por Server-Sent Events (SSE).

O projeto demonstra integração com API externa, separação de responsabilidades, tipagem, cache de curta duração, tratamento de falhas parciais, streaming HTTP, testes automatizados e pipeline de qualidade.

## Visão geral

- **Frontend:** React 18, TypeScript e Vite.
- **Backend:** Python 3.12, FastAPI, Pydantic e HTTPX assíncrono.
- **Tempo real:** Server-Sent Events; o navegador recebe eventos sem polling contínuo.
- **Fonte dos dados:** [Open-Meteo Forecast API](https://open-meteo.com/en/docs).
- **Testes e qualidade:** pytest, Ruff, TypeScript e build de produção.
- **Deploy:** configuração inicial para Render, com serviço de API e site estático.

## Como funciona

1. Ao iniciar, o backend cria um serviço de meteorologia e inicia uma tarefa de atualização periódica.
2. O serviço consulta as cidades em paralelo, com timeout configurável.
3. O snapshot mais recente fica disponível em `GET /api/weather`.
4. Clientes conectados a `GET /api/weather/stream` recebem o snapshot inicial e as atualizações seguintes por SSE.
5. Se uma cidade falhar, o serviço preserva a última leitura conhecida daquela cidade e sinaliza que o snapshot está desatualizado. Se ainda não houver cache, a cidade sem resposta é omitida.
6. O frontend apresenta o estado da conexão e se reconecta automaticamente por meio do comportamento nativo de `EventSource`.

O intervalo de atualização controla a frequência das consultas ao provedor. “Tempo real”, neste contexto, significa entrega imediata ao navegador após cada ciclo de consulta; a API meteorológica não é uma estação de medição segundo a segundo.

## Estrutura do repositório

```text
live-weather-monitor/
├── .github/workflows/quality.yml
├── backend/
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/config.py
│   │   ├── schemas/weather.py
│   │   ├── services/weather_service.py
│   │   └── main.py
│   ├── tests/test_api.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/components/WeatherCard.tsx
│   ├── src/lib/
│   ├── src/styles/global.css
│   ├── src/App.tsx
│   └── package.json
├── render.yaml
└── README.md
```

## Executar localmente

Requisitos: Python 3.12 ou superior, Node.js 22 ou superior e npm.

### 1. Backend

Linux/macOS:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

A documentação interativa fica em `http://localhost:8000/docs`. O endpoint de saúde é `http://localhost:8000/api/health`.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`. Abra `http://localhost:5173`.

O frontend usa `VITE_API_URL` como endereço base do backend. Em desenvolvimento, mantenha `http://localhost:8000`; no deploy, configure a URL pública da API.

## API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Verificação de saúde do serviço |
| `GET` | `/api/cities` | Lista de cidades monitoradas |
| `GET` | `/api/weather` | Último snapshot disponível |
| `GET` | `/api/weather/stream` | Fluxo SSE com eventos `weather` |
| `GET` | `/docs` | Documentação OpenAPI/Swagger |

Exemplo de consumo SSE no navegador:

```typescript
const events = new EventSource('http://localhost:8000/api/weather/stream');
events.addEventListener('weather', (event) => {
  const snapshot = JSON.parse((event as MessageEvent<string>).data);
  console.log(snapshot);
});
```

## Testes e checagens

A partir de `backend/`:

```bash
pytest -q
ruff check app tests
```

A partir de `frontend/`:

```bash
npm ci
npm run build
```

O GitHub Actions executa os testes do backend, o lint e o build do frontend em pushes e pull requests. Os testes automatizados não dependem de uma chave de API, pois o provedor utilizado é público.

## Deploy gratuito no Render

O arquivo `render.yaml` descreve dois serviços: API Python via Docker e frontend estático. Para configurar:

1. Envie este repositório para sua conta GitHub.
2. No Render, crie um **Blueprint** e selecione o repositório.
3. Confira os dois serviços definidos em `render.yaml` antes de confirmar.
4. Ajuste `FRONTEND_ORIGIN` no serviço de API para a URL real do frontend e `VITE_API_URL` para a URL real da API. Os nomes sugeridos no arquivo são exemplos; o Render pode atribuir outros endereços se houver conflito.
5. Faça o deploy e verifique `/api/health`, `/docs` e o carregamento dos eventos no painel.

Os serviços gratuitos podem entrar em suspensão após inatividade e levar algum tempo para acordar. O filesystem e a memória de um serviço gratuito não devem ser tratados como armazenamento persistente. Este projeto não armazena dados de usuários.

## Decisões e limites conhecidos

- SSE é adequado porque o fluxo de dados vai do servidor para o navegador. Se o produto precisar de comunicação bidirecional, presença complexa ou eventos de alta frequência, WebSocket pode ser mais apropriado.
- O cache é em memória e compartilhado apenas dentro de um processo. Para múltiplas réplicas, mova o snapshot e a publicação de eventos para Redis ou outro serviço compartilhado.
- A API pública pode ter limites e indisponibilidades; timeouts e cache reduzem o impacto, mas não substituem monitoramento operacional.
- O endpoint SSE envia keep-alives e limita cada fila a um snapshot pendente para evitar acumular atualizações para clientes lentos.
- Não há autenticação porque os dados são públicos e a aplicação é demonstrativa. Para dados privados, adicione autenticação, autorização, limites de requisição e uma política de segurança adequada.

## Licença

MIT. Consulte `LICENSE`.
