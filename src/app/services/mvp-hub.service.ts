import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MvpFeature {
  key: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  status: 'live' | 'testing' | 'coming-soon';
  type: 'saas' | 'demo';
  features: string[];
  previewRoute: string | null;
  stats: {
    activeUsers: number;
    trialDays: number;
  };
  createdAt: string;
}

export interface MvpHubResponse {
  success: boolean;
  count: number;
  mvps: MvpFeature[];
  message?: string; // Mensaje opcional de error o info
}

export interface MvpDetailsResponse {
  success: boolean;
  mvp: MvpFeature & {
    previewEnabled: boolean;
    plans: any[];
    stats: {
      activeUsers: number;
      totalUsers: number;
      conversionRate: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class MvpHubService {
  private apiUrl = `${environment.URL_SERVICE}mvp-hub`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener listado de MVPs disponibles para el Hub
   * 
   * @param includeComingSoon - Incluir MVPs en estado 'coming-soon'
   * @param type - Filtrar por tipo: 'saas', 'demo', 'all'
   */
  getMvps(includeComingSoon = false, type: 'saas' | 'demo' | 'all' = 'all'): Observable<MvpHubResponse> {
    const params: any = {};
    
    if (includeComingSoon) {
      params.includeComingSoon = 'true';
    }
    
    if (type !== 'all') {
      params.type = type;
    }

    return this.http.get<MvpHubResponse>(`${this.apiUrl}/modules`, { params });
  }

  /**
   * Obtener detalles completos de un MVP específico
   * 
   * @param key - Clave del módulo (ej: 'video-express', 'mailflow')
   */
  getMvpDetails(key: string): Observable<MvpDetailsResponse> {
    return this.http.get<MvpDetailsResponse>(`${this.apiUrl}/modules/${key}`);
  }
}
