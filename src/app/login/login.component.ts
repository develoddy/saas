import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SaasService } from '../core/saas.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  error: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
      // ← module key removed - se autodetecta del backend
    });
  }

  ngOnInit(): void {
    // Si ya está autenticado, redirigir
    if (this.saasService.isAuthenticated()) {
      const tenant = this.saasService.getCurrentTenant();
      if (tenant) {
        this.router.navigate([`/${tenant.module_key}`]);
      }
    }

    // Ya no necesitamos query params para moduleKey - lo detectamos automáticamente
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.saasService.login({ email, password }).subscribe({
      next: (response) => {
        console.log('✅ Login response:', response);
        
        if (response.success) {
          // Si el backend devuelve "modules", significa que el usuario tiene múltiples productos
          if (response.modules && Array.isArray(response.modules)) {
            
            if (response.modules.length === 1) {
              // SOLO 1 módulo → redirigir directo
              const module = response.modules[0];
              console.log('📍 Usuario con 1 solo módulo, redirigiendo directo a:', module.dashboard_url);
              
              // Hacer segundo request con moduleKey para obtener token
              this.saasService.login({ email, password, moduleKey: module.module_key }).subscribe({
                next: (authResponse) => {
                  // Verificar si tiene acceso o si trial expiró
                  if (authResponse.tenant && !authResponse.tenant.has_access) {
                    console.log('⏰ Trial expirado o sin acceso, redirigiendo a /upgrade');
                    this.router.navigate(['/upgrade']);
                  } else {
                    const path = authResponse.dashboard_url ? authResponse.dashboard_url.replace('/app/', '/') : '/newsletter-campaigns';
                    this.router.navigate([path]);
                  }
                  this.isSubmitting = false;
                },
                error: (err) => {
                  console.error('❌ Error en autenticación específica:', err);
                  // Si el error es 403, probablemente sea trial expirado
                  if (err.status === 403) {
                    console.log('⏰ Trial expirado (403), redirigiendo a /upgrade');
                    this.router.navigate(['/upgrade']);
                  } else {
                    this.error = err.error?.error || 'Error al acceder al módulo';
                  }
                  this.isSubmitting = false;
                }
              });
              
            } else {
              // MÚLTIPLES módulos → mostrar selector
              console.log(`📍 Usuario con ${response.modules.length} módulos, mostrando selector`);
              this.router.navigate(['/select-app'], {
                state: { modules: response.modules, email, password }
              });
              this.isSubmitting = false;
            }
            
          } else if (response.tenant && response.token) {
            // Respuesta antigua (con moduleKey) - mantener compatibilidad
            const path = response.dashboard_url ? response.dashboard_url.replace('/app/', '/') : '/newsletter-campaigns';
            console.log('📍 Navegando a:', path);
            this.router.navigate([path]).then(() => {
              console.log('✅ Navegación completada');
              this.isSubmitting = false;
            });
          }
        } else {
          console.error('❌ Login no exitoso:', response);
          this.error = 'Error en el login';
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        console.error('❌ Error logging in:', error);
        this.error = error.error?.error || 'Credenciales inválidas';
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }
}
