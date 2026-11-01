import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RainMetricsFilters,
  RainMetricsOverview,
  RainMetricsQuery,
  RainMetricsResponse
} from './rain-metrics.models';

@Injectable({ providedIn: 'root' })
export class RainMetricsApiService {
  private readonly baseUrl = '/api/rain-metrics';

  constructor(private readonly http: HttpClient) {}

  getFilters(): Observable<RainMetricsFilters> {
    return this.http.get<RainMetricsFilters>(`${this.baseUrl}/filters`);
  }

  getOverview(): Observable<RainMetricsOverview> {
    return this.http.get<RainMetricsOverview>(`${this.baseUrl}/heavy-rain`);
  }

  getMetrics(query: RainMetricsQuery): Observable<RainMetricsResponse> {
    let params = new HttpParams().set('view', query.view);
    if (query.date) params = params.set('date', query.date);
    if (query.month) params = params.set('month', query.month);
    if (query.year !== undefined) params = params.set('year', query.year);
    if (query.week !== undefined) params = params.set('week', query.week);
    if (query.deviceId) params = params.set('deviceId', query.deviceId);
    if (query.location) params = params.set('location', query.location);
    return this.http.get<RainMetricsResponse>(this.baseUrl, { params });
  }
}
