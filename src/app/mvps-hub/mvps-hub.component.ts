import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SaasService } from '../core/saas.service';
import { MvpHubService, MvpFeature } from '../services/mvp-hub.service';
import { MvpAnalyticsService, MvpSummary } from '../services/mvp-analytics.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-mvps-hub',
  templateUrl: './mvps-hub.component.html',
  styleUrls: ['./mvps-hub.component.scss']
})
export class MvpsHubComponent implements OnInit {
  
  isAuthenticated = false;
  currentTenant: any = null;
  mvps: MvpFeature[] = [];
  isLoading = true;
  error: string = '';
  
  // Labs Mode vs Store Mode
  isLabsMode = false; // TRUE cuando no hay MVPs con tracción
  isStoreMode = false; // TRUE cuando hay MVPs con tracción
  
  // Sistema vivo - indicadores de actividad
  lastActivityTime!: Date;
  systemActive = true;
  
  // Modal de acceso anticipado
  showEarlyAccessModal = false;
  
  // MVP Analytics Dashboard
  mvpAnalytics: MvpSummary[] = [];
  selectedPeriod: '7d' | '30d' | '90d' | 'all' = '30d';
  hasMvpData = false;

  constructor(
    private router: Router,
    private saasService: SaasService,
    private mvpHubService: MvpHubService,
    private mvpAnalyticsService: MvpAnalyticsService
  ) {}

  ngOnInit(): void {
    // Simular última actividad del sistema (en producción vendría del backend)
    this.lastActivityTime = new Date(Date.now() - Math.random() * 45 * 60 * 1000); // últimos 45 min
    
    // Check if user is already authenticated
    this.isAuthenticated = this.saasService.isAuthenticated();
    
    if (this.isAuthenticated) {
      this.currentTenant = this.saasService.getCurrentTenant();
    }

    // Load MVPs with real traction
    this.loadActiveMvps();
    
    // Load MVP Analytics Dashboard
    this.loadMvpAnalytics();
  }

  /**
   * Cargar MVPs activos con señales reales de tracción
   * Activa Labs Mode o Store Mode según el resultado
   */
  loadActiveMvps(): void {
    this.isLoading = true;
    this.error = '';
    this.isLabsMode = false;
    this.isStoreMode = false;

    this.mvpHubService.getMvps(false, 'all').subscribe({
      next: (response) => {
        if (response.success) {
          if (response.count > 0) {
            // STORE MODE: Hay MVPs con tracción real
            this.mvps = response.mvps;
            this.isStoreMode = true;
            if (!environment.production) {
              console.log(`✅ Store Mode: ${response.count} MVPs activos`);
            }
          } else {
            // LABS MODE: No hay MVPs con señales reales (honesto)
            this.mvps = [];
            this.isLabsMode = true;
          }
        } else {
          this.error = response.message || 'No se pudieron cargar los MVPs';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading MVPs:', err);
        this.error = 'Error al conectar con el servidor. Por favor intenta más tarde.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Ir al preview de un MVP
   */
  goToPreview(mvp: MvpFeature): void {
    if (mvp.status === 'coming-soon') {
      return;
    }
    
    if (mvp.previewRoute) {
      this.router.navigate([mvp.previewRoute]);
    }
  }

  /**
   * Reintentar carga de MVPs
   */
  retryLoad(): void {
    this.loadActiveMvps();
  }

  /**
   * Ir a login
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Ir a registro
   */
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Ir al dashboard del usuario autenticado
   */
  goToDashboard(): void {
    if (this.currentTenant?.module_key) {
      this.router.navigate([`/${this.currentTenant.module_key}`]);
    }
  }
  
  /**
   * Obtener tiempo relativo desde última actividad
   */
  getTimeSinceLastActivity(): string {
    if (!this.lastActivityTime) return 'hace un momento';
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastActivityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'hace un momento';
    if (diffMins === 1) return 'hace 1 minuto';
    if (diffMins < 60) return `hace ${diffMins} minutos`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'hace 1 hora';
    if (diffHours < 24) return `hace ${diffHours} horas`;
    
    return 'hace más de 1 día';
  }
  
  /**
   * Solicitar notificación de acceso anticipado
   */
  requestEarlyAccess(): void {
    // TODO: Integrar con backend para guardar email/interés
    console.log('🔔 Usuario solicitó notificación de acceso anticipado');
    this.showEarlyAccessModal = true;
  }
  
  /**
   * Cerrar modal de acceso anticipado
   */
  closeEarlyAccessModal(): void {
    this.showEarlyAccessModal = false;
  }
  
  /**
   * Cargar analytics de MVPs
   */
  loadMvpAnalytics(): void {
    this.mvpAnalyticsService.getAllMvps(this.selectedPeriod).subscribe({
      next: (response) => {
        if (response.success && response.mvps.length > 0) {
          // Ordenar MVPs por tracción (más sesiones primero)
          this.mvpAnalytics = response.mvps.sort((a, b) => {
            // Prioridad 1: MVPs listos para probar
            const aReady = this.isReadyToTry(a) ? 1 : 0;
            const bReady = this.isReadyToTry(b) ? 1 : 0;
            if (aReady !== bReady) return bReady - aReady;
            
            // Prioridad 2: Health score
            if (a.health_score !== b.health_score) return b.health_score - a.health_score;
            
            // Prioridad 3: Total de sesiones
            return b.total_sessions - a.total_sessions;
          });
          
          this.hasMvpData = true;
          if (!environment.production) {
            console.log(`📊 ${response.mvps.length} MVP(s) con analytics disponibles`);
          }
        } else {
          this.mvpAnalytics = [];
          this.hasMvpData = false;
        }
      },
      error: (err) => {
        // Si es 404, el endpoint no está implementado aún (silenciar error)
        if (err.status === 404) {
          // Silencioso: endpoint no disponible
          this.mvpAnalytics = [];
          this.hasMvpData = false;
        } else if (!environment.production) {
          console.error('❌ Error analytics:', err.message || err.status);
          this.mvpAnalytics = [];
          this.hasMvpData = false;
        } else {
          this.mvpAnalytics = [];
          this.hasMvpData = false;
        }
      }
    });
  }
  
  /**
   * Cambiar período de análisis
   */
  changePeriod(period: '7d' | '30d' | '90d' | 'all'): void {
    this.selectedPeriod = period;
    this.loadMvpAnalytics();
  }
  
  /**
   * Ir a detalles del MVP
   */
  goToMvpDetails(moduleKey: string): void {
    // Por ahora navegar a preview, en futuro se podría crear vista de detalles
    this.router.navigate(['/preview', moduleKey]);
  }
  
  /**
   * Obtener clase de health score
   */
  getHealthScoreClass(score: number): string {
    return this.mvpAnalyticsService.getHealthScoreColor(score);
  }
  
  /**
   * Obtener badge de estado
   */
  getStatusBadge(status: string): { class: string; icon: string; label: string } {
    return this.mvpAnalyticsService.getStatusBadge(status);
  }
  
  /**
   * Obtener ícono de recomendación
   */
  getRecommendationIcon(action: string): string {
    return this.mvpAnalyticsService.getRecommendationIcon(action);
  }
  
  // ==========================================
  // MÉTODOS PÚBLICOS (para usuarios externos)
  // ==========================================
  
  /**
   * Obtener nivel de health público (sin números exactos)
   */
  getPublicHealthLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
  
  /**
   * Obtener etiqueta de health pública
   */
  getPublicHealthLabel(score: number): string {
    const level = this.getPublicHealthLevel(score);
    if (level === 'high') return 'Alto';
    if (level === 'medium') return 'Medio';
    return 'Bajo';
  }
  
  /**
   * Obtener estado público del MVP (sin exponer lógica interna)
   */
  getPublicStatus(mvp: MvpSummary): string {
    if (mvp.insufficient_data) {
      return 'Recolectando datos';
    }
    
    if (mvp.health_score >= 70) {
      return 'En validación avanzada';
    }
    
    if (mvp.health_score >= 40) {
      return 'En validación';
    }
    
    return 'Fase temprana';
  }
  
  /**
   * Obtener clase CSS para estado público
   */
  getPublicStatusClass(mvp: MvpSummary): string {
    if (mvp.insufficient_data) return 'status-collecting';
    if (mvp.health_score >= 70) return 'status-advanced';
    if (mvp.health_score >= 40) return 'status-validating';
    return 'status-early';
  }
  
  /**
   * Obtener mensaje amigable sobre el estado del MVP (mejorado con popularidad)
   */
  getPublicMessage(mvp: MvpSummary): string {
    if (mvp.insufficient_data) {
      return 'Necesitamos más datos antes de publicar este experimento';
    }
    
    // Mensajes dinámicos basados en engagement real
    if (mvp.total_sessions >= 50 && mvp.wizard_completions >= 10) {
      return 'Experimento muy usado - Validación avanzada con tracción demostrable';
    }
    
    if (mvp.total_sessions >= 30 && mvp.health_score >= 70) {
      return 'Popular esta semana - Señales positivas de uso y retención';
    }
    
    if (mvp.health_score >= 70 && mvp.wizard_completions >= 5) {
      return 'Este experimento muestra señales positivas de validación';
    }
    
    if (mvp.health_score >= 40 && mvp.total_sessions >= 15) {
      return 'Experimento en proceso de validación con usuarios reales';
    }
    
    return 'Fase inicial de pruebas y recolección de feedback';
  }
  
  /**
   * Determinar si el MVP está listo para probar (tracción mínima)
   */
  isReadyToTry(mvp: MvpSummary): boolean {
    // Criterios: health alto + tracción real + completitud
    return mvp.health_score >= 70 && 
           mvp.total_sessions >= 20 && 
           mvp.wizard_completions >= 5 &&
           !mvp.insufficient_data;
  }
  
  /**
   * Obtener badge especial si el MVP tiene alta tracción
   */
  getSpecialBadge(mvp: MvpSummary): { show: boolean; label: string; class: string } | null {
    // Badge "Popular" para MVPs con mucha tracción
    if (mvp.total_sessions >= 50 && mvp.wizard_completions >= 10) {
      return { show: true, label: '🔥 Popular', class: 'badge-popular' };
    }
    
    // Badge "Alta demanda" para buenos health scores con uso
    if (mvp.health_score >= 80 && mvp.total_sessions >= 30) {
      return { show: true, label: '✨ Alta demanda', class: 'badge-high-demand' };
    }
    
    // Badge "Listo" para MVPs validados
    if (this.isReadyToTry(mvp)) {
      return { show: true, label: '✅ Listo para probar', class: 'badge-ready' };
    }
    
    return null;
  }
  
  /**
   * Obtener texto del CTA dinámico
   */
  getCtaText(mvp: MvpSummary): string {
    if (this.isReadyToTry(mvp)) {
      return 'Probar ahora';
    }
    
    if (mvp.insufficient_data) {
      return 'Muy pronto';
    }
    
    return 'Avisarme cuando esté listo';
  }
  
  /**
   * Obtener ícono del CTA
   */
  getCtaIcon(mvp: MvpSummary): string {
    if (this.isReadyToTry(mvp)) {
      return 'bi-play-circle';
    }
    
    if (mvp.insufficient_data) {
      return 'bi-clock';
    }
    
    return 'bi-bell';
  }
  
  /**
   * Manejar click en CTA dinámico
   */
  handleMvpCta(mvp: MvpSummary): void {
    if (this.isReadyToTry(mvp)) {
      // Navegar al preview/wizard del MVP
      this.router.navigate(['/preview', mvp.module_key]);
    } else {
      // Solicitar notificación
      this.requestEarlyAccess();
    }
  }
}
