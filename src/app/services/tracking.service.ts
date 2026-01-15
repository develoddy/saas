import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface TrackingEvent {
  event: string;
  properties?: { [key: string]: any };
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  tenantId?: number;
  module?: string;
  source?: string;
}

/**
 * Tracking Service
 * 
 * Servicio genérico para tracking de eventos en el frontend.
 * Soporta tracking anónimo (sessionId) y autenticado (userId/tenantId).
 * 
 * Eventos se envían al backend y también se guardan localmente para análisis.
 */
@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private apiUrl = `${environment.URL_SERVICE}tracking`;
  private sessionId: string;
  private userId: string | null = null;
  private tenantId: number | null = null;
  
  // Buffer local de eventos (para fallback si backend falla)
  private eventBuffer: TrackingEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  
  constructor(private http: HttpClient) {
    this.sessionId = this.getOrCreateSessionId();
    this.loadUserContext();
  }

  /**
   * Track event principal
   */
  track(eventName: string, properties?: { [key: string]: any }): void {
    // Extraer module y source de properties para enviarlos al nivel raíz
    const module = properties?.['module'];
    const source = properties?.['source'];
    
    const event: TrackingEvent = {
      event: eventName,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      tenantId: this.tenantId || undefined,
      module: module || undefined,
      source: source || undefined
    };
    
    // Agregar a buffer local
    this.addToBuffer(event);
    
    // Enviar al backend (async, no bloqueante)
    this.sendToBackend(event).catch(err => {
      console.warn('⚠️ Tracking event not sent to backend:', err);
      // No fallar si el backend no responde
    });
    
    // Log en desarrollo
    if (!environment.production) {
      console.log('📊 [Tracking]', eventName, properties);
    }
  }

  /**
   * Track page view
   */
  pageView(pageName: string, properties?: { [key: string]: any }): void {
    this.track('page_view', {
      page: pageName,
      url: window.location.href,
      ...properties
    });
  }

  /**
   * Track wizard step
   */
  wizardStep(step: number, module: string, properties?: { [key: string]: any }): void {
    this.track('wizard_step_completed', {
      step,
      module,
      source: this.getSource(),
      ...properties
    });
  }

  /**
   * Track preview generation
   */
  previewGenerated(module: string, properties?: { [key: string]: any }): void {
    this.track('preview_generated', {
      module,
      source: 'preview_wizard',
      ...properties
    });
  }

  /**
   * Track conversion (registro desde preview)
   */
  conversionStarted(module: string, source: string = 'preview'): void {
    this.track('conversion_started', {
      module,
      source,
      from_preview: source === 'preview'
    });
  }

  /**
   * Track registro completado
   */
  registrationCompleted(module: string, tenantId: number): void {
    this.track('registration_completed', {
      module,
      tenantId,
      had_preview: this.hasPreviewInSession(module)
    });
  }

  /**
   * Track activación de módulo
   */
  moduleActivated(module: string, properties?: { [key: string]: any }): void {
    this.track('module_activated', {
      module,
      ...properties
    });
  }

  /**
   * Identificar usuario después de login/registro
   */
  identify(userId: string, tenantId: number, traits?: { [key: string]: any }): void {
    this.userId = userId;
    this.tenantId = tenantId;
    
    // Guardar en localStorage para persistir entre sesiones
    localStorage.setItem('tracking_user_id', userId);
    localStorage.setItem('tracking_tenant_id', tenantId.toString());
    
    this.track('user_identified', {
      userId,
      tenantId,
      ...traits
    });
  }

  /**
   * Limpiar identificación (logout)
   */
  reset(): void {
    this.userId = null;
    this.tenantId = null;
    localStorage.removeItem('tracking_user_id');
    localStorage.removeItem('tracking_tenant_id');
  }

  /**
   * Obtener eventos del buffer local (para debugging)
   */
  getLocalEvents(eventName?: string): TrackingEvent[] {
    if (eventName) {
      return this.eventBuffer.filter(e => e.event === eventName);
    }
    return [...this.eventBuffer];
  }

  /**
   * Obtener métricas del funnel actual
   */
  getFunnelMetrics(module: string): {
    wizardStarted: boolean;
    stepsCompleted: number[];
    previewGenerated: boolean;
    conversionStarted: boolean;
    registrationCompleted: boolean;
  } {
    const events = this.getLocalEvents();
    const moduleEvents = events.filter(e => e.properties?.['module'] === module);
    
    return {
      wizardStarted: moduleEvents.some(e => e.event === 'wizard_step_completed'),
      stepsCompleted: moduleEvents
        .filter(e => e.event === 'wizard_step_completed')
        .map(e => e.properties?.['step'])
        .filter((v, i, a) => a.indexOf(v) === i), // unique
      previewGenerated: moduleEvents.some(e => e.event === 'preview_generated'),
      conversionStarted: moduleEvents.some(e => e.event === 'conversion_started'),
      registrationCompleted: moduleEvents.some(e => e.event === 'registration_completed')
    };
  }

  // ========== Métodos Privados ==========

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('tracking_session_id', sessionId);
    }
    
    return sessionId;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadUserContext(): void {
    const userId = localStorage.getItem('tracking_user_id');
    const tenantId = localStorage.getItem('tracking_tenant_id');
    
    if (userId) this.userId = userId;
    if (tenantId) this.tenantId = parseInt(tenantId, 10);
  }

  private getSource(): string {
    const path = window.location.pathname;
    
    if (path.includes('/preview/')) return 'preview';
    if (path.includes('/onboarding')) return 'onboarding';
    if (path.includes('/mailflow')) return 'dashboard';
    
    return 'unknown';
  }

  private hasPreviewInSession(module: string): boolean {
    const previewKey = `${module}_preview`;
    return !!sessionStorage.getItem(previewKey);
  }

  private addToBuffer(event: TrackingEvent): void {
    this.eventBuffer.push(event);
    
    // Mantener buffer limitado
    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }
    
    // Guardar en localStorage para persistir
    try {
      localStorage.setItem('tracking_events', JSON.stringify(this.eventBuffer));
    } catch (e) {
      console.warn('⚠️ Could not save tracking events to localStorage');
    }
  }

  private async sendToBackend(event: TrackingEvent): Promise<void> {
    try {
      await this.http.post(`${this.apiUrl}/events`, event, {
        headers: { 'Content-Type': 'application/json' }
      }).toPromise();
    } catch (error) {
      // Fallar silenciosamente, el tracking no debe bloquear la UX
      throw error;
    }
  }
}
