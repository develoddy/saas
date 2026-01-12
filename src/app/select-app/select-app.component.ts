import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SaasService } from '../core/saas.service';

interface ModuleInfo {
  module_key: string;
  module_name: string;
  icon: string;
  color: string;
  status: string;
  plan: string;
  trial_ends_at?: string;
  days_remaining?: number;
  has_access: boolean;
  dashboard_url: string;
}

@Component({
  selector: 'app-select-app',
  templateUrl: './select-app.component.html',
  styleUrls: ['./select-app.component.scss']
})
export class SelectAppComponent implements OnInit {
  modules: ModuleInfo[] = [];
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  error: string = '';

  constructor(
    private router: Router,
    private saasService: SaasService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.modules = navigation.extras.state['modules'] || [];
      this.email = navigation.extras.state['email'] || '';
      this.password = navigation.extras.state['password'] || '';
    }
  }

  ngOnInit(): void {
    // Si no hay módulos, redirigir al login
    if (this.modules.length === 0) {
      this.router.navigate(['/login']);
    }
  }

  selectModule(module: ModuleInfo): void {
    if (!module.has_access) {
      this.error = `No tienes acceso a ${module.module_name}. Por favor, verifica tu suscripción.`;
      return;
    }

    this.isLoading = true;
    this.error = '';

    // Hacer login con el módulo específico para obtener el token
    this.saasService.login({
      email: this.email,
      password: this.password,
      moduleKey: module.module_key
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          // El servicio ya guarda el token, solo redirigir
          this.router.navigate([module.dashboard_url]);
        } else {
          this.error = response.message || 'Error al acceder al módulo';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error en select module:', err);
        this.error = err.error?.message || 'Error al conectar con el servidor';
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'trial':
        return 'status-trial';
      case 'active':
        return 'status-active';
      case 'cancelled':
      case 'suspended':
      case 'expired':
        return 'status-inactive';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'trial':
        return 'Período de prueba';
      case 'active':
        return 'Suscripción activa';
      case 'cancelled':
        return 'Cancelado';
      case 'suspended':
        return 'Suspendido';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  }
}
