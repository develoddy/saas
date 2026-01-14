import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  emailFromUrl: string | null = null; // Email del usuario desde URL
  moduleKeyFromUrl: string | null = null; // Module key desde URL

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Obtener email y moduleKey de query params si viene desde el email
    this.route.queryParams.subscribe(params => {
      this.emailFromUrl = params['email'] || null;
      this.moduleKeyFromUrl = params['module'] || null;
    });
    
    this.loadTenantProfile();
  }

  /**
   * Cargar perfil del tenant y los planes disponibles
   */
  loadTenantProfile(): void {
    const token = localStorage.getItem('tenant_token');
    
    if (!token) {
      // No hay sesión - mostrar página de upgrade sin info del tenant
      console.log('📧 No hay sesión, mostrando planes públicos...');
      this.tenant = null;
      this.loadModulePlans();
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
        // Si hay error, mostrar planes de todas formas
        this.tenant = null;
        this.loadModulePlans();
      }
    });
  }

  /**
   * Cargar planes del módulo SaaS
   */
  loadModulePlans(): void {
    // Determinar qué moduleKey usar: del tenant o de la URL
    const moduleKey = this.tenant?.module_key || this.moduleKeyFromUrl;
    
    if (!moduleKey) {
      this.error = 'No se pudo identificar el módulo';
      this.loading = false;
      return;
    }

    // Usar endpoint público para obtener planes
    this.http.get<any>(
      `${environment.URL_SERVICE}modules/public/${moduleKey}`
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
    // Si no hay sesión, redirigir a login primero
    if (!this.tenant) {
      console.log('🔒 No hay sesión activa, redirigiendo a login...');
      const email = this.emailFromUrl || '';
      this.router.navigate(['/login'], {
        queryParams: { 
          returnUrl: '/upgrade',
          email: email
        }
      });
      return;
    }

    if (!plan.stripe_price_id || this.processingPlan) {
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
