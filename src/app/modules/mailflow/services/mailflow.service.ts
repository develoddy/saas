import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  GenerateSequenceRequest,
  GeneratedSequence,
  SequenceStatus
} from '../onboarding/models/onboarding-wizard.models';

@Injectable({
  providedIn: 'root'
})
export class MailflowService {
  private apiUrl = `${environment.API_URL}/mailflow`;

  constructor(private http: HttpClient) {}

  /**
   * Genera una secuencia de onboarding automática basada en el tipo de negocio y objetivo
   */
  generateSequence(payload: GenerateSequenceRequest): Observable<GeneratedSequence> {
    return this.http.post<GeneratedSequence>(`${this.apiUrl}/sequences/generate`, payload);
  }

  /**
   * Activa una secuencia para que comience a enviar emails
   */
  activateSequence(sequenceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sequences/${sequenceId}/activate`, {});
  }

  /**
   * Pausa una secuencia activa
   */
  pauseSequence(sequenceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sequences/${sequenceId}/pause`, {});
  }

  /**
   * Actualiza un email específico de la secuencia
   */
  updateSequenceEmail(sequenceId: string, emailOrder: number, updates: Partial<{ subject: string; bodyHtml: string; bodyText: string }>): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/sequences/${sequenceId}/emails/${emailOrder}`,
      updates
    );
  }

  /**
   * Obtiene el estado y estadísticas de una secuencia
   */
  getSequenceStatus(sequenceId: string): Observable<SequenceStatus> {
    return this.http.get<SequenceStatus>(`${this.apiUrl}/sequences/${sequenceId}/status`);
  }

  /**
   * Obtiene una secuencia específica
   */
  getSequence(sequenceId: string): Observable<GeneratedSequence> {
    return this.http.get<GeneratedSequence>(`${this.apiUrl}/sequences/${sequenceId}`);
  }
}
