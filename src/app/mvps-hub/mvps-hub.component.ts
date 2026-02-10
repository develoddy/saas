import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SaasService } from '../core/saas.service';
import { MvpHubService, MvpFeature } from '../services/mvp-hub.service';

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

  constructor(
    private router: Router,
    private saasService: SaasService,
    private mvpHubService: MvpHubService
  ) {}

  ngOnInit(): void {
    // Simular última actividad del sistema (en producción vendría del backend)
    this.lastActivityTime = new Date(Date.now() - Math.random() * 45 * 60 * 1000); // últimos 45 min
    
    // Check if user is already authenticated
    this.isAuthenticated = this.saasService.isAuthenticated();
    
    if (this.isAuthenticated) {
      this.currentTenant = this.saasService.getCurrentTenant();
      console.log('✅ Usuario ya autenticado:', this.currentTenant);
    }

    // Load MVPs with real traction
    this.loadActiveMvps();
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
            console.log(`✅ Store Mode: ${response.count} MVPs con tracción real:`, this.mvps);
          } else {
            // LABS MODE: No hay MVPs con señales reales (honesto)
            this.mvps = [];
            this.isLabsMode = true;
            console.log('🧪 Labs Mode: No hay MVPs con tracción demostrable todavía');
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
}
