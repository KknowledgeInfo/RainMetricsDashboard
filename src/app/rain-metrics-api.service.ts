import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RainMetricsFilters,
  RainMetricsLocationOption,
  RainMetricsOverview,
  RainMetricsQuery,
  RainMetricsResponse
} from './rain-metrics.models';

@Injectable({ providedIn: 'root' })
export class RainMetricsApiService {
  private readonly baseUrl = 'https://rainmetricsapi.onrender.com/api/rain-metrics';

  constructor(private readonly http: HttpClient) {}

  getLocationFilters(
    stateId: number,
    districtId?: number,
    subDistrictId?: number,
    cityVillageId?: number
  ): Observable<RainMetricsFilters> {
    let params = new HttpParams().set('stateId', stateId);
    if (districtId !== undefined) params = params.set('districtId', districtId);
    if (subDistrictId !== undefined) params = params.set('subDistrictId', subDistrictId);
    if (cityVillageId !== undefined) params = params.set('cityVillageId', cityVillageId);
    return this.http.get<RainMetricsFilters>(`${this.baseUrl}/filters`, { params });
  }

  getStates(): Observable<RainMetricsLocationOption[]> {
    return this.http.get<RainMetricsLocationOption[]>(`${this.baseUrl}/locations/states`);
  }

  getDistricts(stateId: number): Observable<RainMetricsLocationOption[]> {
    return this.http.get<RainMetricsLocationOption[]>(`${this.baseUrl}/locations/districts`, {
      params: new HttpParams().set('stateId', stateId)
    });
  }

  getSubDistricts(districtId: number): Observable<RainMetricsLocationOption[]> {
    return this.http.get<RainMetricsLocationOption[]>(`${this.baseUrl}/locations/sub-districts`, {
      params: new HttpParams().set('districtId', districtId)
    });
  }

  getCityVillages(subDistrictId: number): Observable<RainMetricsLocationOption[]> {
    return this.http.get<RainMetricsLocationOption[]>(`${this.baseUrl}/locations/city-villages`, {
      params: new HttpParams().set('subDistrictId', subDistrictId)
    });
  }

  getOverview(query: Pick<RainMetricsQuery, 'stateId' | 'districtId' | 'subDistrictId' | 'cityVillageId'>): Observable<RainMetricsOverview> {
    let params = new HttpParams().set('stateId', query.stateId);
    if (query.districtId !== undefined) params = params.set('districtId', query.districtId);
    if (query.subDistrictId !== undefined) params = params.set('subDistrictId', query.subDistrictId);
    if (query.cityVillageId !== undefined) params = params.set('cityVillageId', query.cityVillageId);
    return this.http.get<RainMetricsOverview>(`${this.baseUrl}/heavy-rain`, { params });
  }

  getMetrics(query: RainMetricsQuery): Observable<RainMetricsResponse> {
    let params = new HttpParams()
      .set('view', query.view)
      .set('stateId', query.stateId);
    if (query.districtId !== undefined) params = params.set('districtId', query.districtId);
    if (query.subDistrictId !== undefined) params = params.set('subDistrictId', query.subDistrictId);
    if (query.cityVillageId !== undefined) params = params.set('cityVillageId', query.cityVillageId);
    if (query.date) params = params.set('date', query.date);
    if (query.month) params = params.set('month', query.month);
    if (query.year !== undefined) params = params.set('year', query.year);
    if (query.week !== undefined) params = params.set('week', query.week);
    if (query.deviceId) params = params.set('deviceId', query.deviceId);
    if (query.location) params = params.set('location', query.location);
    return this.http.get<RainMetricsResponse>(this.baseUrl, { params });
  }
}
