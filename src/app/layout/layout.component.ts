import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { SaasService, TenantProfile } from '../core/saas.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  tenant: TenantProfile | null = null;
  sidebarCollapsed = false;
  onboardingMode = false; // Detecta si estamos en onboarding
  mobileSidebarOpen = false; // Control del sidebar en móvil

  constructor(
    private saasService: SaasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 🔄 Sincronizar tenant: primero del localStorage, luego actualizar del backend
    this.saasService.currentTenant$.subscribe(tenant => {
      this.tenant = tenant;
      // Detectar si necesita onboarding basado en el perfil
      this.checkOnboardingMode(this.router.url);
    });

    // 🔧 Cargar perfil actualizado del backend (esto actualiza el tenant$ automáticamente)
    this.saasService.getProfile().subscribe({
      error: (err) => {
        console.error('Error loading profile:', err);
        // Si el token es inválido, hacer logout
        if (err.status === 401) {
          this.saasService.logout();
          this.router.navigate(['/login']);
        }
      }
    });

    // Detectar modo onboarding basado en la ruta
    this.checkOnboardingMode(this.router.url);
    
    // Escuchar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkOnboardingMode(event.url);
      this.closeMobileSidebar(); // Cerrar sidebar móvil al navegar
    });
  }

  private checkOnboardingMode(url: string): void {
    this.onboardingMode = url.includes('/onboarding');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  logout(): void {
    this.saasService.logout();
    this.router.navigate(['/login']);
  }

  getStatusBadge(): string {
    if (!this.tenant) return '';
    if (this.tenant.is_on_trial) return 'Trial';
    if (this.tenant.status === 'active') return 'Pro';
    return 'Inactivo';
  }

  getStatusClass(): string {
    if (!this.tenant) return 'status-inactive';
    if (this.tenant.is_on_trial) return 'status-trial';
    if (this.tenant.status === 'active') return 'status-active';
    return 'status-inactive';
  }

  getTrialDaysRemaining(): number | null {
    if (!this.tenant?.is_on_trial || !this.tenant.trial_ends_at) return null;
    const trialEnd = new Date(this.tenant.trial_ends_at);
    const today = new Date();
    const diffTime = trialEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
}
