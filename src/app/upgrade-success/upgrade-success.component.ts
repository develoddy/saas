import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SaasService } from '../core/saas.service';

@Component({
  selector: 'app-upgrade-success',
  templateUrl: './upgrade-success.component.html',
  styleUrls: ['./upgrade-success.component.scss']
})
export class UpgradeSuccessComponent implements OnInit {
  loading = true;
  error: string | null = null;
  sessionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService
  ) {}

  ngOnInit(): void {
    // Obtener session_id de la URL (opcional)
    this.route.queryParams.subscribe(params => {
      this.sessionId = params['session_id'];
      console.log('Session ID from Stripe:', this.sessionId);
      
      // Verificar pago incluso sin session_id
      this.verifyPayment();
    });
  }

  verifyPayment(): void {
    // Esperar unos segundos para que el webhook procese la subscripción
    setTimeout(() => {
      // Recargar perfil del tenant
      this.saasService.getProfile().subscribe({
        next: (response) => {
          if (response.success && response.tenant) {
            console.log('✅ Perfil actualizado:', response.tenant);
            this.loading = false;
            
            // Verificar si la subscripción fue activada
            if (response.tenant.status === 'active') {
              console.log('🎉 Subscripción activada correctamente');
              
              // Redirigir al dashboard después de 3 segundos
              setTimeout(() => {
                this.router.navigate([`/${response.tenant.module_key}`]);
              }, 3000);
            } else {
              // Si aún no está activo, esperar un poco más
              console.log('⏳ Esperando activación... Status:', response.tenant.status);
              this.error = 'Procesando tu subscripción, por favor espera...';
              
              // Intentar de nuevo después de 3 segundos
              setTimeout(() => {
                this.verifyPayment();
              }, 3000);
            }
          }
        },
        error: (err) => {
          console.error('Error loading profile:', err);
          this.error = 'Error al verificar tu subscripción';
          this.loading = false;
        }
      });
    }, 2000);
  }

  goToDashboard(): void {
    const token = localStorage.getItem('tenant_token');
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    
    if (token && tenant.module_key) {
      this.router.navigate([`/${tenant.module_key}`]);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
