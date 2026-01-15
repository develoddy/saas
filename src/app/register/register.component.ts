import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SaasService } from '../core/saas.service';
import { ModulePreviewService } from '../services/module-preview.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  error: string = '';
  success: string = '';
  
  // Preview context
  fromPreview = false;
  moduleKey = '';
  previewData: any = null;
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private saasService: SaasService,
    private previewService: ModulePreviewService
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Detectar si viene desde preview
    this.fromPreview = this.route.snapshot.queryParams['from_preview'] === 'true';
    this.moduleKey = this.route.snapshot.queryParams['module'] || '';
    
    if (this.fromPreview && this.moduleKey) {
      // Cargar preview data desde sessionStorage
      this.previewData = this.previewService.getPreviewFromSession(this.moduleKey);
      console.log('🎯 Usuario viene desde preview:', {
        moduleKey: this.moduleKey,
        hasPreviewData: !!this.previewData
      });
    }
    
    // Pre-llenar email si viene de URL
    const emailFromUrl = this.route.snapshot.queryParams['email'];
    if (emailFromUrl) {
      this.registerForm.patchValue({ email: emailFromUrl });
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { 'passwordMismatch': true };
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.success = '';

    const { name, email, password } = this.registerForm.value;

    try {
      // 1. Crear cuenta + trial
      const registerResponse = await this.saasService.startTrial({
        name,
        email,
        password,
        moduleKey: this.moduleKey || 'mailflow', // Default a mailflow si no viene módulo
        plan: 'trial'
      }).toPromise();

      if (registerResponse && registerResponse.success) {
        console.log('✅ Trial started:', registerResponse);
        
        // 2. Si viene desde preview, convertir preview en configuración real
        if (this.fromPreview && this.previewData && this.moduleKey) {
          await this.convertPreviewToReal();
        }
        
        // 3. Redirigir al dashboard del módulo
        const dashboardUrl = registerResponse.dashboard_url?.replace('/app/', '/') || `/${this.moduleKey}`;
        
        this.success = '¡Cuenta creada! Redirigiendo a tu dashboard...';
        
        setTimeout(() => {
          this.router.navigate([dashboardUrl]);
        }, 1500);
        
      } else {
        this.error = 'Error al crear la cuenta';
        this.isSubmitting = false;
      }
      
    } catch (err: any) {
      console.error('❌ Error en registro:', err);
      this.error = err.error?.error || 'Error al crear la cuenta. Intenta de nuevo.';
      this.isSubmitting = false;
    }
  }

  /**
   * Convertir preview en configuración real
   */
  private async convertPreviewToReal(): Promise<void> {
    try {
      console.log('🔄 Convirtiendo preview en configuración real...');
      
      const result = await this.previewService.convertPreviewToReal(
        this.moduleKey,
        this.previewData,
        true // auto-activate
      ).toPromise();
      
      console.log('✅ Preview convertido:', result);
      
      // Limpiar sessionStorage
      this.previewService.clearPreviewFromSession(this.moduleKey);
      
    } catch (err) {
      console.error('⚠️ Error convirtiendo preview (no crítico):', err);
      // No bloquear el flujo si falla la conversión
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.hasError(error) && control.touched);
  }

  get passwordsMatch(): boolean {
    return !this.registerForm.hasError('passwordMismatch');
  }
}
