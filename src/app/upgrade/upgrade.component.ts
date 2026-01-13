import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface TenantProfile {
  id: number;
  name: string;
  email: string;
  module_key: string;
  plan: string;
  status: string;
  trial_ends_at?: string;
  days_remaining?: number;
  has_access?: boolean;
  is_on_trial?: boolean;
}

interface PricingPlan {
  name: string;
  price: number;
  description: string;
  features?: string[];
  stripe_price_id?: string;
  recommended?: boolean;
}

@Component({
  selector: 'app-upgrade',
  templateUrl: './upgrade.component.html',
  styleUrls: ['./upgrade.component.scss']
})
export class UpgradeComponent implements OnInit {
  tenant: TenantProfile | null = null;
  plans: PricingPlan[] = [];
  loading = true;
  error: string | null = null;
  processingPlan: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadTenantProfile();
  }

  /**
   * Cargar perfil del tenant y los planes disponibles
   */
  loadTenantProfile(): void {
    const token = localStorage.getItem('tenant_token');
    
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Obtener perfil del tenant
    this.http.get<{ success: boolean; tenant: TenantProfile }>(
      `${environment.URL_SERVICE}saas/me`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success && response.tenant) {
          this.tenant = response.tenant;
          this.loadModulePlans();
        }
      },
      error: (err) => {
        console.error('Error loading tenant profile:', err);
        this.error = 'Error al cargar tu información';
        this.loading = false;
      }
    });
  }

  /**
   * Cargar planes del módulo SaaS
   */
  loadModulePlans(): void {
    if (!this.tenant) return;

    // Usar endpoint público para obtener planes
    this.http.get<any>(
      `${environment.URL_SERVICE}modules/public/${this.tenant.module_key}`
    ).subscribe({
      next: (response) => {
        if (response.module && response.module.saas_config?.pricing) {
          this.plans = response.module.saas_config.pricing;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading module plans:', err);
        this.error = 'Error al cargar los planes disponibles';
        this.loading = false;
      }
    });
  }

  /**
   * Iniciar proceso de subscripción con Stripe
   */
  async subscribeToPlan(plan: PricingPlan): Promise<void> {
    if (!this.tenant || !plan.stripe_price_id || this.processingPlan) {
      return;
    }

    this.processingPlan = plan.name;

    // Log de depuración del plan seleccionado
    console.log('🎯 Plan seleccionado:', {
      name: plan.name,
      price: plan.price,
      stripe_price_id: plan.stripe_price_id
    });

    try {
      const requestBody = {
        tenantId: this.tenant.id,
        moduleKey: this.tenant.module_key,
        planName: plan.name,
        stripePriceId: plan.stripe_price_id,
        successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/upgrade?canceled=true`
      };

      // Log de la petición completa
      console.log('📤 Enviando petición a Stripe:', requestBody);

      // Crear sesión de Stripe Checkout
      const response = await this.http.post<{ 
        success: boolean; 
        sessionId: string; 
        url: string 
      }>(
        `${environment.URL_SERVICE}stripe/create-subscription-checkout`,
        requestBody
      ).toPromise();

      if (response?.success && response.url) {
        // Redirigir a Stripe Checkout
        window.location.href = response.url;
      } else {
        throw new Error('No se recibió URL de Stripe');
      }
    } catch (error: any) {
      console.error('Error creating subscription checkout:', error);
      alert(error.error?.message || 'Error al procesar el pago. Inténtalo de nuevo.');
      this.processingPlan = null;
    }
  }

  /**
   * Volver al dashboard (si aún tiene acceso)
   */
  goToDashboard(): void {
    if (this.tenant && this.tenant.has_access) {
      this.router.navigate([`/${this.tenant.module_key}`]);
    }
  }
}
