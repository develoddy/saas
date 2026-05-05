import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  GenerateSequenceRequest,
  GeneratedSequence,
  SequenceStatus
} from '../onboarding/models/onboarding-wizard.models';

/**
 * ============================================================================
 * MAILFLOW SERVICE - MVP MODE (PUBLIC VALIDATION)
 * ============================================================================
 * 
 * ⚠️ DO NOT REVERT YET - VALIDATION PHASE ACTIVE
 * 
 * CURRENT STATE:
 * - No auth headers sent (intentional for MVP)
 * - localStorage used for sequence identification (see listSequences)
 * - Single-user session model
 * 
 * WHY:
 * - Public API calls without authentication
 * - localStorage as temporary user identity
 * - Quick market validation without login friction
 * 
 * LOCALSTORAGE USAGE:
 * - Key: 'mailflow_sequences'
 * - Value: Array of sequenceIds ["seq_abc123", "seq_xyz456", ...]
 * - Created by: onboarding-wizard.component.ts (saveSequenceIdToLocalStorage)
 * - Used by: listSequences() to fetch user's sequences
 * 
 * FUTURE (PRODUCTION):
 * - Add auth headers (JWT / Bearer token)
 * - Remove localStorage dependency
 * - Use real user/tenant context from auth service
 * - Workspace-based API calls
 * 
 * @date 2026-05-05
 * ============================================================================
 */
@Injectable({
  providedIn: 'root'
})
export class MailflowService {
  private apiUrl = `${environment.API_URL}/mailflow`;

  constructor(private http: HttpClient) {}

  /**
   * Genera una secuencia de onboarding automática basada en el tipo de negocio y objetivo
   */
  generateSequence(payload: GenerateSequenceRequest): Observable<GeneratedSequence | { data: GeneratedSequence }> {
    return this.http.post<GeneratedSequence | { data: GeneratedSequence }>(`${this.apiUrl}/sequences/generate`, payload);
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

  /**
   * Lista todas las secuencias del tenant
   */
  listSequences(): Observable<any> {
    // MVP público: leer sequenceIds desde localStorage
    const STORAGE_KEY = 'mailflow_sequences';
    let params = {};
    
    try {
      const storedIds = localStorage.getItem(STORAGE_KEY);
      if (storedIds) {
        const idsArray = JSON.parse(storedIds);
        if (idsArray.length > 0) {
          // Enviar como query param: ?sequenceIds=seq1,seq2,seq3
          params = { sequenceIds: idsArray.join(',') };
        }
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
    
    return this.http.get<any>(`${this.apiUrl}/sequences`, { params });
  }
}
