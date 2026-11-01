export type MetricsView = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RainMetricsBucket {
  label: string;
  start: string;
  end: string;
}

export interface RainfallPoint {
  label: string;
  start: string;
  end: string;
  rainfallMm: number;
  heavyRain: boolean;
}

export interface RainMetricsLocation {
  location: string;
  deviceCodes: string[];
  readings: RainfallPoint[];
  totalMm: number;
}

export interface RainMetricsResponse {
  view: MetricsView;
  start: string;
  end: string;
  heavyRainThresholdMm: number;
  buckets: RainMetricsBucket[];
  locations: RainMetricsLocation[];
}

export interface RainMetricsOverviewLocation {
  location: string;
  deviceCodes: string[];
  hourlyRainfallMm: number[];
  totalMm: number;
  peakHourlyRainfallMm: number;
  heavyRain: boolean;
}

export interface RainMetricsOverview {
  start: string;
  end: string;
  heavyRainThresholdMm: number;
  buckets: RainMetricsBucket[];
  locations: RainMetricsOverviewLocation[];
}

export interface RainMetricsDevice {
  id: string;
  code: string;
  location: string;
}

export interface RainMetricsFilters {
  devices: RainMetricsDevice[];
  locations: string[];
}

export interface RainMetricsQuery {
  view: MetricsView;
  date?: string;
  month?: string;
  year?: number;
  week?: number;
  deviceId?: string;
  location?: string;
}
