import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MvpSummary {
  module_key: string;
  module_name: string;
  health_score: number;
  status: 'insufficient_data' | 'continue' | 'create_module' | 'archive';
  total_sessions: number;
  wizard_starts: number;
  wizard_completions: number;
  total_feedback: number;
  conversion_rate: number;
  date_range: string;
  recommendation: {
    action: string;
    confidence: number;
    reasoning: string;
    icon: string;
  };
  insufficient_data: boolean;
  min_required_sessions: number;
}

export interface MvpAnalyticsResponse {
  success: boolean;
  mvps: MvpSummary[];
  total: number;
  timestamp: string;
}

export interface MvpDetailAnalytics {
  success: boolean;
  analytics: {
    moduleName: string;
    moduleKey: string;
    health_score: number;
    totalSessions: number;
    uniqueUsers: number;
    wizard_starts: number;
    wizard_completions: number;
    conversion_rate: number;
    download_rate: number;
    positive_feedback_rate: number;
    total_feedback: number;
    avg_session_duration: number;
    insufficient_data: boolean;
    recommendation: {
      action: string;
      confidence: number;
      reasoning: string;
      icon: string;
    };
    trends: {
      sessions: number;
      starts: number;
      completions: number;
      feedback: number;
    };
  };
}

/**
 * MVP Analytics Service
 * 
 * Servicio para obtener análisis y KPIs de micro-SaaS desde el backend.
 * Extrae datos dinámicamente de tracking_events sin requerir MVPs precargados.
 * 
 * @author AI Assistant
 * @date 2026-02-10
 */
@Injectable({
  providedIn: 'root'
})
export class MvpAnalyticsService {
  private apiUrl = `${environment.URL_SERVICE}mvp-analytics`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener listado de todos los MVPs con analytics resumidos
   */
  getAllMvps(period: '7d' | '30d' | '90d' | 'all' = '30d'): Observable<MvpAnalyticsResponse> {
    return this.http.get<MvpAnalyticsResponse>(`${this.apiUrl}/all`, {
      params: { period }
    });
  }

  /**
   * Obtener analytics detallados de un MVP específico
   */
  getMvpDetail(moduleKey: string, period: '7d' | '30d' | '90d' | 'all' = '30d'): Observable<MvpDetailAnalytics> {
    return this.http.get<MvpDetailAnalytics>(`${this.apiUrl}/${moduleKey}`, {
      params: { period }
    });
  }

  /**
   * Obtener color del health score
   */
  getHealthScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Obtener badge del estado
   */
  getStatusBadge(status: string): { class: string; icon: string; label: string } {
    switch (status) {
      case 'create_module':
        return { class: 'badge-success', icon: '✅', label: 'Listo para Módulo' };
      case 'continue':
        return { class: 'badge-primary', icon: '⏸️', label: 'Continuar Validación' };
      case 'archive':
        return { class: 'badge-danger', icon: '🗄️', label: 'Archivar' };
      case 'insufficient_data':
      default:
        return { class: 'badge-warning', icon: '⚠️', label: 'Datos Insuficientes' };
    }
  }

  /**
   * Obtener ícono de recomendación
   */
  getRecommendationIcon(action: string): string {
    switch (action) {
      case 'create_module':
        return '🚀';
      case 'continue':
        return '⏸️';
      case 'archive':
        return '🗄️';
      case 'wait':
      default:
        return '⏳';
    }
  }
}
