import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MailflowService } from '../services/mailflow.service';
import { TrackingService } from '../../../services/tracking.service';
import {
  WizardStep,
  BusinessType,
  OnboardingGoal,
  EmailTone,
  GeneratedSequence,
  SequenceEmail
} from './models/onboarding-wizard.models';

@Component({
  selector: 'app-onboarding-wizard',
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss']
})
export class OnboardingWizardComponent implements OnInit {
  currentStep = 1;
  totalSteps = 4;

  // Forms para cada paso
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;

  // Datos de la secuencia generada
  generatedSequence: GeneratedSequence | null = null;
  isGenerating = false;
  generationError: string | null = null;

  // Estado del wizard
  steps: WizardStep[] = [
    { step: 1, title: 'Your Business', description: 'Tell us about your business', valid: false },
    { step: 2, title: 'Your Goal', description: 'What do you want to achieve?', valid: false },
    { step: 3, title: 'Your Contacts', description: 'Import your contacts', valid: false },
    { step: 4, title: 'Preview & Launch', description: 'Review your sequence', valid: false }
  ];

  // Opciones para los formularios
  businessTypes: Array<{ value: BusinessType; label: string; icon: string }> = [
    { value: 'ecommerce', label: 'E-commerce', icon: '🛒' },
    { value: 'saas', label: 'SaaS', icon: '💻' },
    { value: 'services', label: 'Services', icon: '🤝' },
    { value: 'education', label: 'Education', icon: '📚' }
  ];

  goals: Array<{ value: OnboardingGoal; label: string; description: string; icon: string }> = [
    { value: 'first-purchase', label: 'First Purchase', description: 'Convert subscribers into customers', icon: '🛍️' },
    { value: 'trial-conversion', label: 'Trial Conversion', description: 'Convert free users to paid', icon: '💳' },
    { value: 'engagement', label: 'Engagement', description: 'Keep users active and engaged', icon: '✨' },
    { value: 'onboarding', label: 'Product Onboarding', description: 'Help users get started', icon: '🚀' }
  ];

  tones: Array<{ value: EmailTone; label: string }> = [
    { value: 'friendly', label: 'Friendly' },
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' }
  ];

  constructor(
    private fb: FormBuilder,
    private mailflowService: MailflowService,
    private router: Router,
    private tracking: TrackingService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.updateStepsValidity();
    
    // Track onboarding started
    this.tracking.pageView('onboarding_wizard', {
      module: 'mailflow',
      source: 'onboarding'
    });
  }

  private initializeForms(): void {
    // Step 1: Business Type
    this.step1Form = this.fb.group({
      businessType: ['', Validators.required],
      brandName: ['', [Validators.required, Validators.minLength(2)]],
      tone: ['friendly', Validators.required]
    });

    // Step 2: Goal
    this.step2Form = this.fb.group({
      goal: ['', Validators.required]
    });

    // Step 3: Contacts
    this.step3Form = this.fb.group({
      contactSource: ['csv', Validators.required],
      csvFile: [null],
      contacts: [[], Validators.required],
      contactsCount: [0, Validators.min(1)]
    });

    // Escuchar cambios para actualizar validez de los pasos
    this.step1Form.valueChanges.subscribe(() => this.updateStepsValidity());
    this.step2Form.valueChanges.subscribe(() => this.updateStepsValidity());
    this.step3Form.valueChanges.subscribe(() => this.updateStepsValidity());
  }

  // Navegación
  nextStep(): void {
    if (this.isStepValid(this.currentStep)) {
      // Track step completion before moving
      this.tracking.wizardStep(this.currentStep, 'mailflow', {
        stepTitle: this.steps[this.currentStep - 1].title,
        source: 'onboarding',
        formData: this.getStepFormData(this.currentStep)
      });
      
      if (this.currentStep === 3) {
        // Antes de ir al paso 4, generar la secuencia
        this.generateSequence();
      } else {
        this.currentStep++;
        this.updateStepsValidity();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    // Solo permitir navegar a pasos anteriores o al actual
    if (step <= this.currentStep && step >= 1) {
      this.currentStep = step;
    }
  }

  // Validación
  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return this.step1Form.valid;
      case 2:
        return this.step2Form.valid;
      case 3:
        return this.step3Form.valid && this.step3Form.value.contactsCount > 0;
      case 4:
        return this.generatedSequence !== null;
      default:
        return false;
    }
  }

  canProceed(): boolean {
    return this.isStepValid(this.currentStep) && !this.isGenerating;
  }

  private updateStepsValidity(): void {
    this.steps[0].valid = this.step1Form.valid;
    this.steps[1].valid = this.step2Form.valid;
    this.steps[2].valid = this.step3Form.valid && this.step3Form.value.contactsCount > 0;
    this.steps[3].valid = this.generatedSequence !== null;
  }

  // Manejo de contactos
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.step3Form.patchValue({ csvFile: file });
      this.parseCSV(file);
    }
  }

  private parseCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const contacts = this.extractEmailsFromCSV(text);
      this.step3Form.patchValue({
        contacts: contacts,
        contactsCount: contacts.length
      });
      this.updateStepsValidity();
    };
    reader.readAsText(file);
  }

  private extractEmailsFromCSV(csvText: string): Array<{ email: string; name?: string }> {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const contacts: Array<{ email: string; name?: string }> = [];

    // Skip header if exists
    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim());
      if (columns[0] && this.isValidEmail(columns[0])) {
        contacts.push({
          email: columns[0],
          name: columns[1] || undefined
        });
      }
    }

    return contacts;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generación de secuencia
  async generateSequence(): Promise<void> {
    this.isGenerating = true;
    this.generationError = null;

    const payload = {
      businessType: this.step1Form.value.businessType,
      goal: this.step2Form.value.goal,
      contactSource: {
        type: this.step3Form.value.contactSource,
        data: this.step3Form.value.contacts
      },
      brandInfo: {
        name: this.step1Form.value.brandName,
        tone: this.step1Form.value.tone
      }
    };

    try {
      const result = await this.mailflowService
        .generateSequence(payload)
        .toPromise();
      
      this.generatedSequence = result || null;

      this.currentStep = 4;
      this.updateStepsValidity();
    } catch (error: any) {
      console.error('Error generating sequence:', error);
      this.generationError = error.error?.message || 'Failed to generate sequence. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  // Editar email de la secuencia
  onEmailEdited(email: SequenceEmail, updates: Partial<SequenceEmail>): void {
    if (this.generatedSequence) {
      const emailToUpdate = this.generatedSequence.emails.find(e => e.order === email.order);
      if (emailToUpdate) {
        Object.assign(emailToUpdate, updates);
      }
    }
  }

  // Activar secuencia
  async activateSequence(): Promise<void> {
    if (!this.generatedSequence) return;

    try {
      await this.mailflowService
        .activateSequence(this.generatedSequence.sequenceId)
        .toPromise();

      // Track sequence activation
      this.tracking.moduleActivated('mailflow', {
        sequence_id: this.generatedSequence.sequenceId,
        sequence_name: this.generatedSequence.sequenceName || this.generatedSequence.name,
        total_emails: this.generatedSequence.emails.length,
        contacts_count: this.step3Form.value.contactsCount,
        source: 'onboarding'
      });

      // Redirigir a una página de éxito o dashboard
      alert('🚀 Sequence activated! Your contacts will start receiving emails.');
      // this.router.navigate(['/mailflow/dashboard']);
    } catch (error: any) {
      console.error('Error activating sequence:', error);
      alert('Failed to activate sequence. Please try again.');
    }
  }

  // Helpers UI
  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getStepClass(step: number): string {
    if (this.currentStep === step) return 'active';
    if (this.currentStep > step) return 'completed';
    return '';
  }

  // Helper para tracking
  private getStepFormData(step: number): any {
    switch (step) {
      case 1:
        return this.step1Form.value;
      case 2:
        return this.step2Form.value;
      case 3:
        return {
          contactSource: this.step3Form.value.contactSource,
          contactsCount: this.step3Form.value.contactsCount
        };
      default:
        return {};
    }
  }
}
