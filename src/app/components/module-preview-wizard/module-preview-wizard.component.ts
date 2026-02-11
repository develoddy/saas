import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModulePreviewService } from '../../services/module-preview.service';
import { TrackingService } from '../../services/tracking.service';

/**
 * Module Preview Wizard Component
 * 
 * Componente genérico para generar previews de cualquier módulo.
 * Se adapta dinámicamente según el module_key en la ruta.
 * 
 * Ruta: /preview/:module_key
 * 
 * Ejemplo: /preview/mailflow muestra wizard de MailFlow
 * 
 * @module components/preview-wizard
 */

interface ModuleWizardConfig {
  steps: {
    title: string;
    description: string;
    fields: {
      name: string;
      label: string;
      type: 'text' | 'select' | 'textarea' | 'email';
      options?: string[];
      required?: boolean;
      placeholder?: string;
    }[];
  }[];
}

interface GeneratedPreview {
  sequenceName: string;
  sequenceType: string;
  industry: string;
  brandName: string;
  emails: Array<{
    order: number;
    delayHours: number;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    editable: boolean;
  }>;
  stats: {
    totalEmails: number;
    estimatedDuration: string;
    sequenceGoal: string;
  };
  _metadata: {
    moduleKey: string;
    moduleName: string;
    generatedAt: string;
    sessionKey: string;
    expiresIn: string;
  };
  [key: string]: any; // Para propiedades dinámicas de otros módulos
}

@Component({
  selector: 'app-module-preview-wizard',
  templateUrl: './module-preview-wizard.component.html',
  styleUrls: ['./module-preview-wizard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ModulePreviewWizardComponent implements OnInit, OnDestroy {
  
  moduleKey = '';
  moduleName = '';
  
  currentStep = 0;
  wizardForm!: FormGroup;
  wizardConfig: ModuleWizardConfig = { steps: [] };
  
  generating = false;
  showGeneratingScreen = false; // Nueva pantalla de "momento whoo"
  generatingProgress = 0; // Progreso simulado
  currentGeneratingMessage = ''; // Mensaje rotativo
  generatedPreview: GeneratedPreview | null = null;
  error: string | null = null;
  
  // Mensajes rotativos para "momento whoo"
  private readonly generatingMessages = [
    'Analyzing your business...',
    'Crafting your email sequence...',
    'Optimizing subject lines...',
    'Personalizing content...',
    'Almost ready...'
  ];
  
  private messageInterval: any;
  private currentMessageIndex = 0;
  
  // Configuración del delay (en ms)
  private readonly WHOO_MOMENT_DELAY = 2500; // 2.5 segundos
  
  // Configuraciones específicas por módulo
  // Cada módulo puede tener su config local sin depender de la BD
  private moduleConfigs: { [key: string]: ModuleWizardConfig } = {
    mailflow: {
      steps: [
        {
          title: 'Business Information',
          description: 'Tell us about your business',
          fields: [
            {
              name: 'industry',
              label: 'Industry',
              type: 'select',
              options: ['ecommerce', 'saas', 'services', 'education'],
              required: true,
              placeholder: 'Select your industry'
            },
            {
              name: 'brandName',
              label: 'Brand Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your brand name'
            }
          ]
        },
        {
          title: 'Sequence Type',
          description: 'Choose the type of email sequence',
          fields: [
            {
              name: 'goals',
              label: 'Sequence Goal',
              type: 'select',
              options: ['increase_sales', 'build_loyalty', 'onboarding', 'nurture', 'conversion', 're-engagement'],
              required: true,
              placeholder: 'Select your primary goal'
            }
          ]
        },
        {
          title: 'Preview Contacts',
          description: 'We\'ll use sample contacts for the preview (optional)',
          fields: [
            {
              name: 'goalDescription',
              label: 'Additional Notes',
              type: 'textarea',
              required: false,
              placeholder: 'Any specific goals or notes for your sequence? (optional)'
            }
          ]
        }
      ]
    }
    // Aquí se pueden agregar configuraciones para otros módulos
  };
  
  // Nombres de módulos (fallback si no hay config en BD)
  private moduleNames: { [key: string]: string } = {
    mailflow: 'MailFlow',
    videoexpress: 'Video Express',
    newsletter: 'Newsletter Campaigns'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private previewService: ModulePreviewService,
    private tracking: TrackingService
  ) {}

  ngOnInit(): void {
    // Obtener moduleKey de la ruta
    this.route.params.subscribe(params => {
      this.moduleKey = params['moduleKey'];
      this.loadModuleConfig();
      this.buildForm();
      
      // Track wizard started
      this.tracking.pageView('preview_wizard', {
        module: this.moduleKey,
        source: 'preview'
      });
    });
  }

  /**
   * Cargar configuración del módulo
   * 
   * Estrategia:
   * 1. Si tiene configuración local (moduleConfigs), usarla directamente
   * 2. Si no, intentar cargar desde backend (tabla modules)
   * 
   * Esto permite que módulos como Mailflow funcionen sin depender de la BD
   */
  private async loadModuleConfig(): Promise<void> {
    // ✅ ESTRATEGIA 1: Usar configuración local si existe
    if (this.moduleConfigs[this.moduleKey]) {
      console.log(`✅ Using local config for module: ${this.moduleKey}`);
      this.wizardConfig = this.moduleConfigs[this.moduleKey];
      this.moduleName = this.moduleNames[this.moduleKey] || this.moduleKey;
      return;
    }
    
    // ✅ ESTRATEGIA 2: Cargar desde backend (para módulos dinámicos)
    try {
      console.log(`🔍 Loading config from backend for module: ${this.moduleKey}`);
      const response = await this.previewService.getPreviewConfig(this.moduleKey).toPromise();
      
      if (response.success) {
        this.moduleName = response.config.moduleName;
        this.wizardConfig = this.getDefaultConfig();
      }
      
    } catch (error) {
      console.error('❌ Error loading module config:', error);
      this.error = 'Module not found or preview not available';
    }
  }

  /**
   * Construir formulario dinámicamente
   */
  private buildForm(): void {
    const formConfig: any = {};
    
    const config = this.moduleConfigs[this.moduleKey] || this.getDefaultConfig();
    
    config.steps.forEach(step => {
      step.fields.forEach(field => {
        formConfig[field.name] = [
          '',
          field.required ? Validators.required : []
        ];
      });
    });
    
    this.wizardForm = this.fb.group(formConfig);
  }

  /**
   * Configuración por defecto si el módulo no tiene una específica
   */
  private getDefaultConfig(): ModuleWizardConfig {
    return {
      steps: [
        {
          title: 'Basic Information',
          description: 'Enter basic information',
          fields: [
            {
              name: 'name',
              label: 'Name',
              type: 'text',
              required: true,
              placeholder: 'Enter a name'
            }
          ]
        }
      ]
    };
  }

  /**
   * Obtener campos del paso actual
   */
  getCurrentStepFields() {
    if (!this.wizardConfig) return [];
    return this.wizardConfig.steps[this.currentStep]?.fields || [];
  }

  /**
   * Obtener título del paso actual
   */
  getCurrentStepTitle(): string {
    return this.wizardConfig?.steps[this.currentStep]?.title || '';
  }

  /**
   * Obtener descripción del paso actual
   */
  getCurrentStepDescription(): string {
    return this.wizardConfig?.steps[this.currentStep]?.description || '';
  }

  /**
   * Siguiente paso
   */
  nextStep(): void {
    if (!this.wizardConfig) return;
    
    if (this.currentStep < this.wizardConfig.steps.length - 1) {
      // Track step completion before moving
      this.tracking.wizardStep(this.currentStep + 1, this.moduleKey, {
        stepTitle: this.getCurrentStepTitle(),
        formData: this.getStepFormData()
      });
      
      this.currentStep++;
    }
  }

  /**
   * Paso anterior
   */
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  /**
   * Validar paso actual
   */
  isCurrentStepValid(): boolean {
    const currentFields = this.getCurrentStepFields();
    
    return currentFields.every(field => {
      const control = this.wizardForm.get(field.name);
      return !field.required || (control && control.valid);
    });
  }

  /**
   * Verificar si es el último paso
   */
  isLastStep(): boolean {
    return this.wizardConfig 
      ? this.currentStep === this.wizardConfig.steps.length - 1
      : true;
  }

  /**
   * Generar preview con "momento whoo"
   */
  async generatePreview(): Promise<void> {
    if (!this.wizardForm.valid) {
      this.error = 'Please fill all required fields';
      return;
    }
    
    this.generating = true;
    this.error = null;
    
    try {
      const formData = this.wizardForm.value;
      
      // Transformar goals de string a array si es necesario
      if (formData.goals && typeof formData.goals === 'string') {
        formData.goals = [formData.goals];
      }
      
      console.log('📤 Sending preview request:', formData);
      
      const response = await this.previewService.generatePreview(
        this.moduleKey,
        formData
      ).toPromise();
      
      if (response.success) {
        // 🎉 MOMENTO WHOO: Mostrar pantalla de generación antes del preview
        this.showGeneratingScreen = true;
        this.startGeneratingAnimation();
        
        // Simular progreso mientras se "genera"
        const progressInterval = setInterval(() => {
          if (this.generatingProgress < 95) {
            this.generatingProgress += 5;
          }
        }, 100);
        
        // Esperar el delay configurado para el "momento whoo"
        await new Promise(resolve => setTimeout(resolve, this.WHOO_MOMENT_DELAY));
        
        // Limpiar intervalo de progreso
        clearInterval(progressInterval);
        this.generatingProgress = 100;
        
        // Ocultar pantalla de generación y mostrar preview real
        this.showGeneratingScreen = false;
        this.stopGeneratingAnimation();
        
        this.generatedPreview = response.preview;
        console.log('✅ Preview generated:', this.generatedPreview);
        
        // Track preview generation
        this.tracking.previewGenerated(this.moduleKey, {
          industry: formData.industry,
          goals: formData.goals,
          totalEmails: response.preview.stats?.totalEmails,
          duration: response.preview.stats?.estimatedDuration
        });
      }
      
    } catch (err: any) {
      console.error('❌ Error generating preview:', err);
      this.error = err.error?.error || 'Failed to generate preview';
      this.showGeneratingScreen = false;
      this.stopGeneratingAnimation();
      
    } finally {
      this.generating = false;
    }
  }
  
  /**
   * Iniciar animación de mensajes rotativos
   */
  private startGeneratingAnimation(): void {
    this.currentMessageIndex = 0;
    this.currentGeneratingMessage = this.generatingMessages[0];
    
    this.messageInterval = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.generatingMessages.length;
      this.currentGeneratingMessage = this.generatingMessages[this.currentMessageIndex];
    }, 500); // Cambiar cada 500ms para sensación de actividad
  }
  
  /**
   * Detener animación de mensajes
   */
  private stopGeneratingAnimation(): void {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
    this.generatingProgress = 0;
  }

  /**
   * Manejar conversión exitosa
   */
  handleConversion(result: any): void {
    console.log('✅ Conversion successful:', result);
    this.router.navigate([`/${this.moduleKey}`]);
  }

  /**
   * Editar preview
   */
  editPreview(): void {
    this.generatedPreview = null;
    this.currentStep = 0;
  }

  /**
   * Calcular progreso del wizard
   */
  getProgress(): number {
    if (!this.wizardConfig) return 0;
    return ((this.currentStep + 1) / this.wizardConfig.steps.length) * 100;
  }

  /**
   * Obtener datos del formulario del step actual (para tracking)
   */
  private getStepFormData(): any {
    const currentFields = this.getCurrentStepFields();
    const stepData: any = {};
    
    currentFields.forEach(field => {
      const value = this.wizardForm.get(field.name)?.value;
      if (value) {
        stepData[field.name] = value;
      }
    });
    
    return stepData;
  }
  
  /**
   * Limpiar recursos al destruir el componente
   */
  ngOnDestroy(): void {
    this.stopGeneratingAnimation();
  }
}
