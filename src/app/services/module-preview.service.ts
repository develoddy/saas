import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * Module Preview Service
 * 
 * Servicio Angular genérico para manejar Preview Mode de cualquier módulo SaaS.
 * 
 * Funcionalidades:
 * - Generar previews sin autenticación
 * - Guardar/recuperar previews desde sessionStorage
 * - Validar previews antes de conversión
 * - Convertir previews en configuración real después de login
 * 
 * @module services/module-preview
 */

export interface PreviewConfig {
  enabled: boolean;
  route: string;
  public_endpoint: string;
  show_in_store: boolean;
  demo_button_text: string;
  generator_function: string;
  conversion_config: {
    recovery_key: string;
    redirect_route: string;
    auto_activate: boolean;
  };
  rate_limiting: {
    max_requests: number;
    window_minutes: number;
  };
}

export interface ModulePreview {
  moduleKey: string;
  moduleName: string;
  tagline: string;
  icon: string;
  color: string;
  previewRoute: string;
  demoButtonText: string;
}

export interface PreviewData {
  _metadata: {
    moduleKey: string;
    moduleName: string;
    generatedAt: string;
    sessionKey: string;
    expiresIn: string;
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModulePreviewService {
  private readonly API_URL = environment.API_URL;
  
  // Observable para módulos con preview disponibles
  private availableModulesSubject = new BehaviorSubject<ModulePreview[]>([]);
  public availableModules$ = this.availableModulesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAvailableModules();
  }

  // ========================================
  // ENDPOINTS PÚBLICOS (sin auth)
  // ========================================

  /**
   * Cargar módulos con preview habilitado
   */
  loadAvailableModules(): Observable<any> {
    return this.http.get(`${this.API_URL}/modules/preview/available`)
      .pipe(
        tap((response: any) => {
          if (response.success) {
            this.availableModulesSubject.next(response.modules);
          }
        })
      );
  }

  /**
   * Obtener configuración de preview de un módulo
   */
  getPreviewConfig(moduleKey: string): Observable<any> {
    return this.http.get(`${this.API_URL}/modules/${moduleKey}/preview/config`);
  }

  /**
   * Generar preview para un módulo
   * Guarda automáticamente en sessionStorage
   * 
   * @param moduleKey - Clave del módulo (ej: 'mailflow')
   * @param data - Datos para generar el preview
   */
  generatePreview(moduleKey: string, data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/modules/${moduleKey}/preview/generate`, data)
      .pipe(
        tap((response: any) => {
          if (response.success) {
            this.savePreviewToSession(response.preview);
          }
        })
      );
  }

  /**
   * Validar datos de preview
   */
  validatePreview(previewData: PreviewData): Observable<any> {
    return this.http.post(`${this.API_URL}/modules/validate/preview`, {
      previewData
    });
  }

  // ========================================
  // ENDPOINTS PROTEGIDOS (con auth)
  // ========================================

  /**
   * Convertir preview en configuración real
   * Requiere autenticación
   * 
   * @param moduleKey - Clave del módulo
   * @param previewData - Datos del preview desde sessionStorage
   * @param autoActivate - Activar automáticamente
   */
  convertPreviewToReal(
    moduleKey: string,
    previewData: PreviewData,
    autoActivate = true
  ): Observable<any> {
    // Obtener token de autenticación
    const token = localStorage.getItem('tenant_token');
    
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.post(`${this.API_URL}/modules/${moduleKey}/preview/convert`, {
      previewData,
      autoActivate
    }, { headers });
  }

  // ========================================
  // SESSION STORAGE MANAGEMENT
  // ========================================

  /**
   * Guardar preview en sessionStorage
   */
  savePreviewToSession(previewData: PreviewData): void {
    const sessionKey = previewData._metadata.sessionKey;
    sessionStorage.setItem(sessionKey, JSON.stringify(previewData));
    console.log(`✅ Preview saved to sessionStorage['${sessionKey}']`);
  }

  /**
   * Recuperar preview desde sessionStorage
   */
  getPreviewFromSession(moduleKey: string): PreviewData | null {
    const sessionKey = `${moduleKey}_preview`;
    const stored = sessionStorage.getItem(sessionKey);
    
    if (!stored) {
      return null;
    }
    
    try {
      const previewData = JSON.parse(stored);
      
      // Validar que no haya expirado
      if (this.isPreviewExpired(previewData)) {
        this.clearPreviewFromSession(moduleKey);
        return null;
      }
      
      return previewData;
      
    } catch (error) {
      console.error('❌ Error parsing preview from session:', error);
      return null;
    }
  }

  /**
   * Limpiar preview del sessionStorage
   */
  clearPreviewFromSession(moduleKey: string): void {
    const sessionKey = `${moduleKey}_preview`;
    sessionStorage.removeItem(sessionKey);
    console.log(`🗑️ Preview cleared from sessionStorage['${sessionKey}']`);
  }

  /**
   * Verificar si un preview ha expirado
   */
  private isPreviewExpired(previewData: PreviewData): boolean {
    if (!previewData._metadata || !previewData._metadata.generatedAt) {
      return true;
    }
    
    const generatedAt = new Date(previewData._metadata.generatedAt);
    const now = new Date();
    const hoursSinceGeneration = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceGeneration > 24; // Expira después de 24 horas
  }

  // ========================================
  // CONVERSION FLOW HELPERS
  // ========================================

  /**
   * Verificar si hay preview pendiente de conversión
   * Se usa después de login/registro para pre-llenar wizard
   */
  hasPendingPreview(moduleKey: string): boolean {
    const preview = this.getPreviewFromSession(moduleKey);
    return preview !== null;
  }

  /**
   * Flujo completo de conversión después de login
   * 
   * 1. Recuperar preview de sessionStorage
   * 2. Validar que siga siendo válido
   * 3. Convertir a configuración real en BD
   * 4. Limpiar sessionStorage
   * 5. Retornar resultado
   */
  async processPreviewAfterLogin(moduleKey: string, autoActivate = true): Promise<any> {
    // 1. Recuperar preview
    const preview = this.getPreviewFromSession(moduleKey);
    
    if (!preview) {
      throw new Error('No preview found in session');
    }
    
    // 2. Convertir
    return this.convertPreviewToReal(moduleKey, preview, autoActivate)
      .pipe(
        tap(() => {
          // 4. Limpiar sessionStorage después de conversión exitosa
          this.clearPreviewFromSession(moduleKey);
        })
      )
      .toPromise();
  }

  // ========================================
  // UI HELPERS
  // ========================================

  /**
   * Obtener botón "Try Demo" para mostrar en tienda
   */
  getDemoButtonConfig(moduleKey: string): Observable<any> {
    return this.getPreviewConfig(moduleKey);
  }

  /**
   * Navegar a preview mode
   * Útil para redirección desde botones "Try Demo"
   */
  navigateToPreview(moduleKey: string): string {
    return `/preview/${moduleKey}`;
  }

  /**
   * Obtener ruta de redirección después de login
   * Basado en la configuración del módulo
   */
  getPostLoginRedirect(moduleKey: string): string {
    const preview = this.getPreviewFromSession(moduleKey);
    
    if (!preview) {
      return `/${moduleKey}`;
    }
    
    // Usar ruta de conversión si existe
    return preview._metadata.sessionKey 
      ? `/${moduleKey}/onboarding?from_preview=true`
      : `/${moduleKey}`;
  }
}
