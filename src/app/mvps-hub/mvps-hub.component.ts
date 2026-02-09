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

  constructor(
    private router: Router,
    private saasService: SaasService,
    private mvpHubService: MvpHubService
  ) {}

  ngOnInit(): void {
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
}
