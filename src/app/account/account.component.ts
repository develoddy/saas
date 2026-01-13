import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { SaasService, TenantProfile } from '../core/saas.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  tenant: TenantProfile | null = null;
  loading = true;
  canceling = false;
  showCancelModal = false;
  cancelReason = '';
  error: string | null = null;
  success: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private saasService: SaasService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.saasService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.tenant) {
          this.tenant = response.tenant;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = 'Error al cargar tu perfil';
        this.loading = false;
      }
    });
  }

  openCancelModal(): void {
    this.showCancelModal = true;
    this.error = null;
    this.success = null;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelReason = '';
  }

  async cancelSubscription(): Promise<void> {
    if (!this.tenant?.stripe_subscription_id) {
      this.error = 'No hay suscripción activa para cancelar';
      return;
    }

    this.canceling = true;
    this.error = null;

    const token = localStorage.getItem('tenant_token');
    if (!token) {
      this.error = 'No estás autenticado';
      this.canceling = false;
      return;
    }

    try {
      const response = await this.http.post<{
        success: boolean;
        message: string;
        endsAt?: Date;
      }>(
        `${environment.URL_SERVICE}stripe/cancel-subscription`,
        {
          tenantId: this.tenant.id,
          reason: this.cancelReason
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).toPromise();

      if (response?.success) {
        this.success = response.message || 'Suscripción cancelada correctamente. Conservarás el acceso hasta el fin del período actual.';
        this.closeCancelModal();
        // Reload profile to reflect changes
        setTimeout(async () => {
          await this.loadProfile();
          // Mantener el mensaje de éxito después de recargar
          this.success = '✅ Suscripción cancelada. Conservarás el acceso hasta el final del período pagado.';
          // Limpiar el mensaje después de 5 segundos
          setTimeout(() => {
            this.success = null;
          }, 5000);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      this.error = error.error?.message || 'Error al cancelar la suscripción';
    } finally {
      this.canceling = false;
    }
  }

  async reactivateSubscription(): Promise<void> {
    if (!this.tenant?.stripe_subscription_id) {
      this.error = 'No hay suscripción para reactivar';
      return;
    }

    this.canceling = true;
    this.error = null;

    const token = localStorage.getItem('tenant_token');
    if (!token) {
      this.error = 'No estás autenticado';
      this.canceling = false;
      return;
    }

    try {
      const response = await this.http.post<{
        success: boolean;
        message: string;
      }>(
        `${environment.URL_SERVICE}stripe/reactivate-subscription`,
        { tenantId: this.tenant.id },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).toPromise();

      if (response?.success) {
        this.success = response.message || '✅ Suscripción reactivada. Se renovará automáticamente.';
        // Reload profile to reflect changes
        setTimeout(async () => {
          await this.loadProfile();
          // Mantener el mensaje de éxito después de recargar
          this.success = '✅ Suscripción reactivada correctamente. Tu plan se renovará automáticamente cada mes.';
          // Limpiar el mensaje después de 5 segundos
          setTimeout(() => {
            this.success = null;
          }, 5000);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      this.error = error.error?.message || 'Error al reactivar la suscripción';
    } finally {
      this.canceling = false;
    }
  }

  goToDashboard(): void {
    if (this.tenant) {
      this.router.navigate([`/${this.tenant.module_key}`]);
    }
  }

  upgradeOrChangePlan(): void {
    this.router.navigate(['/upgrade']);
  }
}
