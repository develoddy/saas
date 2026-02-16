import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, TenantConfig } from '../../services/chat.service';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  currentStep = 1;
  totalSteps = 3;
  loading = false;
  error: string | null = null;

  // Formularios por paso
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  
  // Configuración completa
  config: Partial<TenantConfig> = {
    widget_color: '#4F46E5',
    widget_position: 'bottom-right',
    welcome_message: '👋 ¡Hola! ¿En qué podemos ayudarte?',
    integration_type: 'native',
    is_active: true,
    business_hours: {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '10:00', close: '14:00', enabled: false },
      sunday: { open: '10:00', close: '14:00', enabled: false }
    },
    timezone: 'Europe/Madrid',
    auto_response_enabled: true,
    capture_leads: true
  };

  embedCode = '';
  previewUrl = '';

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadExistingConfig();
  }

  initForms(): void {
    // Paso 1: Configuración del Widget
    this.step1Form = this.fb.group({
      widget_color: [this.config.widget_color, Validators.required],
      widget_position: [this.config.widget_position, Validators.required],
      welcome_message: [this.config.welcome_message, [Validators.required, Validators.maxLength(250)]],
      auto_response_enabled: [this.config.auto_response_enabled],
      capture_leads: [this.config.capture_leads]
    });

    // Paso 2: Horarios de atención
    this.step2Form = this.fb.group({
      timezone: [this.config.timezone, Validators.required],
      monday_enabled: [this.config.business_hours?.monday.enabled],
      monday_open: [this.config.business_hours?.monday.open],
      monday_close: [this.config.business_hours?.monday.close],
      tuesday_enabled: [this.config.business_hours?.tuesday.enabled],
      tuesday_open: [this.config.business_hours?.tuesday.open],
      tuesday_close: [this.config.business_hours?.tuesday.close],
      wednesday_enabled: [this.config.business_hours?.wednesday.enabled],
      wednesday_open: [this.config.business_hours?.wednesday.open],
      wednesday_close: [this.config.business_hours?.wednesday.close],
      thursday_enabled: [this.config.business_hours?.thursday.enabled],
      thursday_open: [this.config.business_hours?.thursday.open],
      thursday_close: [this.config.business_hours?.thursday.close],
      friday_enabled: [this.config.business_hours?.friday.enabled],
      friday_open: [this.config.business_hours?.friday.open],
      friday_close: [this.config.business_hours?.friday.close],
      saturday_enabled: [this.config.business_hours?.saturday.enabled],
      saturday_open: [this.config.business_hours?.saturday.open],
      saturday_close: [this.config.business_hours?.saturday.close],
      sunday_enabled: [this.config.business_hours?.sunday.enabled],
      sunday_open: [this.config.business_hours?.sunday.open],
      sunday_close: [this.config.business_hours?.sunday.close]
    });
  }

  loadExistingConfig(): void {
    this.chatService.getConfig().subscribe({
      next: (config) => {
        if (config && config.id) {
          this.config = config;
          this.step1Form.patchValue(config);
          
          // Mapear business_hours al formulario plano
          if (config.business_hours) {
            const flatHours: any = { timezone: config.timezone };
            Object.keys(config.business_hours).forEach(day => {
              flatHours[`${day}_enabled`] = config.business_hours[day].enabled;
              flatHours[`${day}_open`] = config.business_hours[day].open;
              flatHours[`${day}_close`] = config.business_hours[day].close;
            });
            this.step2Form.patchValue(flatHours);
          }

          // Ya está configurado, ir al dashboard
          // this.router.navigate(['/app/smart-chat/dashboard']);
        }
      },
      error: (err) => {
        console.log('No existe configuración previa, creando nueva...', err);
      }
    });
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.step1Form.valid) {
      Object.assign(this.config, this.step1Form.value);
      this.currentStep++;
    } else if (this.currentStep === 2 && this.step2Form.valid) {
      // Convertir formulario plano a estructura business_hours
      const formValue = this.step2Form.value;
      this.config.timezone = formValue.timezone;
      this.config.business_hours = {
        monday: { open: formValue.monday_open, close: formValue.monday_close, enabled: formValue.monday_enabled },
        tuesday: { open: formValue.tuesday_open, close: formValue.tuesday_close, enabled: formValue.tuesday_enabled },
        wednesday: { open: formValue.wednesday_open, close: formValue.wednesday_close, enabled: formValue.wednesday_enabled },
        thursday: { open: formValue.thursday_open, close: formValue.thursday_close, enabled: formValue.thursday_enabled },
        friday: { open: formValue.friday_open, close: formValue.friday_close, enabled: formValue.friday_enabled },
        saturday: { open: formValue.saturday_open, close: formValue.saturday_close, enabled: formValue.saturday_enabled },
        sunday: { open: formValue.sunday_open, close: formValue.sunday_close, enabled: formValue.sunday_enabled }
      };
      this.currentStep++;
      this.generateEmbedCode();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  generateEmbedCode(): void {
    this.embedCode = this.chatService.generateEmbedCode(this.config.tenant_id || 1);
    this.previewUrl = `${window.location.origin}/preview/smart-chat?tenant=${this.config.tenant_id || 1}`;
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.embedCode).then(() => {
      alert('✅ Código copiado al portapapeles');
    });
  }

  saveAndFinish(): void {
    this.loading = true;
    this.error = null;

    this.chatService.updateConfig(this.config).subscribe({
      next: (savedConfig) => {
        console.log('✅ Configuración guardada:', savedConfig);
        this.loading = false;
        
        // Detectar si estamos en preview o en app autenticada
        const isPreview = window.location.pathname.includes('/preview/');
        const dashboardRoute = isPreview ? '/preview/smart-chat/dashboard' : '/app/smart-chat/dashboard';
        this.router.navigate([dashboardRoute]);
      },
      error: (err) => {
        console.error('❌ Error al guardar configuración:', err);
        this.error = 'Error al guardar la configuración. Intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getDayLabel(day: string): string {
    const labels: { [key: string]: string } = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
    return labels[day] || day;
  }
}
