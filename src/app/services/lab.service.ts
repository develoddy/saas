import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LabExperiment {
  key: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: 'testing' | 'live';
  screenshots: string[];
  features: string[];
}

export interface LabExperimentsResponse {
  success: boolean;
  count: number;
  experiments: LabExperiment[];
}

@Injectable({
  providedIn: 'root'
})
export class LabService {
  private readonly apiUrl = `${environment.URL_SERVICE}lab`;

  constructor(private http: HttpClient) {}

  getExperiments(): Observable<LabExperimentsResponse> {
    return this.http.get<LabExperimentsResponse>(
      `${this.apiUrl}/experiments`
    );
  }
}
