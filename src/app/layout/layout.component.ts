import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SaasService, TenantProfile } from '../core/saas.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  tenant: TenantProfile | null = null;
  sidebarCollapsed = false;

  constructor(
    private saasService: SaasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.saasService.currentTenant$.subscribe(tenant => {
      this.tenant = tenant;
    });

    // Cargar perfil
    this.saasService.getProfile().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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
}
