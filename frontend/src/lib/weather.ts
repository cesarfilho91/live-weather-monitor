import type { CurrentWeather } from './types';

export function weatherDescription(code: number): string {
  if (code === 0) return 'Céu limpo';
  if ([1, 2].includes(code)) return 'Poucas nuvens';
  if (code === 3) return 'Nublado';
  if ([45, 48].includes(code)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Garoa';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Chuva';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Neve';
  if ([95, 96, 99].includes(code)) return 'Trovoada';
  return 'Condição variável';
}

export function weatherIcon(code: number): string {
  if (code === 0) return '☀';
  if ([1, 2, 3].includes(code)) return '☁';
  if ([45, 48].includes(code)) return '≋';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☂';
  if ([95, 96, 99].includes(code)) return 'ϟ';
  return '☁';
}

export function formatTime(value: string | null): string {
  if (!value) return 'Aguardando primeira leitura';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date(value));
}

export function getConditionSummary(items: CurrentWeather[]): string {
  if (!items.length) return 'Coletando dados meteorológicos';
  const average = items.reduce((total, item) => total + item.temperature_c, 0) / items.length;
  if (average >= 30) return 'Calor predominante nas cidades monitoradas';
  if (average <= 16) return 'Temperaturas amenas no conjunto monitorado';
  return 'Condições variadas nas cidades monitoradas';
}
