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
  moduleKey: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      moduleKey: ['', [Validators.required]]
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

    // Obtener moduleKey desde query params
    this.route.queryParams.subscribe(params => {
      if (params['module']) {
        this.moduleKey = params['module'];
        this.loginForm.patchValue({ moduleKey: this.moduleKey });
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    this.saasService.login(this.loginForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          // Extraer solo el path del dashboard_url
          const path = response.dashboard_url.replace('/app/', '/');
          this.router.navigate([path]);
        }
      },
      error: (error) => {
        console.error('Error logging in:', error);
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
