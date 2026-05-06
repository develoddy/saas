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

/**
 * ============================================================================
 * MAILFLOW ONBOARDING WIZARD - MVP MODE (PUBLIC VALIDATION)
 * ============================================================================
 * 
 * ⚠️ DO NOT REVERT YET - VALIDATION PHASE ACTIVE
 * 
 * CURRENT STATE:
 * - No authentication required (intentional for MVP)
 * - localStorage-based persistence (see saveSequenceIdToLocalStorage)
 * - Single-user session model
 * - Public wizard accessible at /mailflow/onboarding
 * 
 * WHY:
 * - Zero friction onboarding for early adopters
 * - Real conversion measurement without login wall
 * - Pricing validation ($19/mo question after activation)
 * - Quick market validation
 * 
 * FLOW:
 * 1. User completes wizard (no login required)
 * 2. Sequence generated → sequenceId saved to localStorage
 * 3. User activates sequence → validation modal appears
 * 4. User answers pricing question → tracked to DB
 * 5. User redirected to dashboard → shows their sequences
 * 
 * FUTURE (AFTER VALIDATION):
 * - Require authentication before wizard
 * - Remove localStorage persistence
 * - Use real user/tenant context
 * - Workspace-based isolation
 * - Proper session management
 * 
 * VALIDATION GOALS:
 * - 10-50 real users creating sequences
 * - Conversion metrics (landing → wizard → activation)
 * - Payment intent signals (validation_response tracking)
 * 
 * @date 2026-05-05
 * ============================================================================
 */
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
  previewContacts: Array<{ email: string; name?: string }> = []; // Contactos para preview en Step 4
  isGenerating = false;
  generationError: string | null = null;
  sequenceActivated = false; // Estado de activación de la secuencia
  expandedEmails: Set<number> = new Set(); // Track de emails expandidos en preview

  // Delivery Preview & SMTP Validation
  smtpStatus: 'checking' | 'connected' | 'error' = 'connected'; // Estado de SMTP (hardcoded para MVP)
  smtpLastTestTime = new Date(); // Timestamp del último test SMTP
  confirmRealRecipientsChecked = false; // Usuario confirma que entiende emails reales
  showContactsList = false; // Toggle para mostrar/ocultar lista completa de contactos

  // Validation modal
  showValidationModal = false;
  validationResponse: 'yes' | 'maybe' | 'no' | null = null;
  validationComment = '';

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

  // System para añadir contactos reales manualmente
  newContactEmail = '';
  newContactName = '';
  emailValidationError = '';
  manualContacts: Array<{ email: string; name?: string }> = [];

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

    // Step 3: Contacts (CSV o manual - EMAILS REALES)
    this.step3Form = this.fb.group({
      contactSource: ['manual', Validators.required],
      csvFile: [null],
      contacts: [this.manualContacts], // Inicializar vacío
      contactsCount: [0],
      notes: [''] // Campo opcional para notas
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
    // Step 3 siempre válido (contactos de ejemplo por defecto o CSV)
    this.steps[2].valid = this.step3Form.value.contactsCount > 0;
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
      
      // Limitar a 5 contactos para MVP preview
      const limitedContacts = contacts.slice(0, 5);
      
      if (limitedContacts.length > 0) {
        // Añadir contactos del CSV a manualContacts (sin duplicar)
        limitedContacts.forEach(contact => {
          const emailLower = contact.email.toLowerCase();
          if (!this.manualContacts.some(c => c.email.toLowerCase() === emailLower)) {
            this.manualContacts.push(contact);
          }
        });

        // Actualizar formulario
        this.step3Form.patchValue({
          contacts: this.manualContacts,
          contactsCount: this.manualContacts.length,
          contactSource: 'csv'
        });

        console.log(`✅ ${limitedContacts.length} contacts imported from CSV`);
      } else {
        console.warn('⚠️ No valid contacts found in CSV file');
        alert('No valid email addresses found in CSV file. Please add contacts manually.');
      }
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
      const line = lines[i].trim();
      if (!line) continue; // Ignorar líneas vacías
      
      const columns = line.split(',').map(col => col.trim());
      const email = columns[0];
      const name = columns[1];
      
      // Validar email antes de agregar
      if (email && this.isValidEmail(email)) {
        // Rechazar emails de example.com
        if (!email.toLowerCase().includes('@example.com')) {
          contacts.push({
            email,
            name: name || undefined
          });
        } else {
          console.warn(`⚠️ Skipping fake email: ${email}`);
        }
      }
    }

    return contacts;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ========== MANEJO DE CONTACTOS MANUALES ==========

  /**
   * Añadir contacto manual con validación
   */
  addManualContact(): void {
    this.emailValidationError = '';

    // Validar email
    if (!this.newContactEmail || !this.newContactEmail.trim()) {
      this.emailValidationError = 'Email is required';
      return;
    }

    if (!this.isValidEmail(this.newContactEmail.trim())) {
      this.emailValidationError = 'Invalid email format';
      return;
    }

    // Validar que no sea example.com
    if (this.newContactEmail.toLowerCase().includes('@example.com')) {
      this.emailValidationError = 'example.com emails are not valid. Use a real email address.';
      return;
    }

    // Validar duplicados
    const emailLower = this.newContactEmail.trim().toLowerCase();
    if (this.manualContacts.some(c => c.email.toLowerCase() === emailLower)) {
      this.emailValidationError = 'This email is already in your list';
      return;
    }

    // Añadir contacto
    this.manualContacts.push({
      email: this.newContactEmail.trim(),
      name: this.newContactName.trim() || undefined
    });

    // Actualizar formulario
    this.step3Form.patchValue({
      contacts: this.manualContacts,
      contactsCount: this.manualContacts.length,
      contactSource: 'manual'
    });

    // Limpiar campos
    this.newContactEmail = '';
    this.newContactName = '';
    this.emailValidationError = '';

    this.updateStepsValidity();

    console.log('✅ Contact added:', this.manualContacts[this.manualContacts.length - 1]);
  }

  /**
   * Eliminar contacto de la lista manual
   */
  removeManualContact(index: number): void {
    this.manualContacts.splice(index, 1);
    
    // Actualizar formulario
    this.step3Form.patchValue({
      contacts: this.manualContacts,
      contactsCount: this.manualContacts.length
    });

    this.updateStepsValidity();
  }

  /**
   * Validar que Step 3 tenga al menos 1 contacto
   */
  private isStep3Valid(): boolean {
    return this.step3Form.valid && this.manualContacts.length > 0;
  }

  // Generación de secuencia
  async generateSequence(): Promise<void> {
    this.isGenerating = true;
    this.generationError = null;

    // Obtener contactos del formulario
    let contactsFromForm = this.step3Form.value.contacts;
    
    // Validar que haya contactos reales
    if (!contactsFromForm || !Array.isArray(contactsFromForm) || contactsFromForm.length === 0) {
      this.generationError = 'Please add at least one real email contact before continuing';
      this.isGenerating = false;
      return;
    }
    
    // Limitar a 5 contactos para preview MVP
    this.previewContacts = contactsFromForm.slice(0, 5);
    
    console.log('📧 Contacts for sequence:', {
      source: this.step3Form.value.contactSource,
      total: this.previewContacts.length,
      contacts: this.previewContacts
    });

    const payload = {
      businessType: this.step1Form.value.businessType,
      goal: this.step2Form.value.goal,
      contactSource: {
        type: this.step3Form.value.contactSource || 'sample',
        data: this.previewContacts
      },
      brandInfo: {
        name: this.step1Form.value.brandName,
        tone: this.step1Form.value.tone
      }
    };

    try {
      const response = await this.mailflowService
        .generateSequence(payload)
        .toPromise();
      
      // Extraer data de la respuesta del backend (puede venir anidada o directa)
      const data = (response && 'data' in response) ? response.data : response;
      
      // Emails por defecto
      const defaultEmails: SequenceEmail[] = [
        { subject: 'Welcome to our community', bodyHtml: '<p>Hello {{name}}, welcome!</p>', bodyText: 'Hello {{name}}, welcome!', delayHours: 0, order: 1, editable: true },
        { subject: 'Getting started', bodyHtml: '<p>Here are your first steps...</p>', bodyText: 'Here are your first steps...', delayHours: 24, order: 2, editable: true },
        { subject: 'Need help?', bodyHtml: '<p>We\'re here for you!</p>', bodyText: 'We\'re here for you!', delayHours: 72, order: 3, editable: true }
      ];
      
      // Asegurar que siempre tengamos arrays válidos
      this.generatedSequence = {
        sequenceId: data?.sequenceId || null,
        name: data?.name || 'Sample Onboarding Sequence',
        emails: (data && Array.isArray(data.emails)) ? data.emails : defaultEmails,
        estimatedContacts: data?.estimatedContacts || this.previewContacts.length,
        status: data?.status || 'draft'
      };
      
      console.log('✅ Sequence generated:', {
        sequenceId: this.generatedSequence?.sequenceId,
        name: this.generatedSequence?.name,
        emails: this.generatedSequence?.emails?.length || 0,
        contacts: this.previewContacts.length
      });

      // 💾 Guardar sequenceId en localStorage para MVP público
      if (this.generatedSequence?.sequenceId) {
        this.saveSequenceIdToLocalStorage(this.generatedSequence.sequenceId);
      }

      this.currentStep = 4;
      this.updateStepsValidity();
    } catch (error: any) {
      console.error('❌ Error generating sequence:', error);
      this.generationError = error.error?.message || 'Failed to generate sequence. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  // Editar email de la secuencia
  onEmailEdited(email: SequenceEmail, updates: Partial<SequenceEmail>): void {
    if (this.generatedSequence?.emails) {
      const emailToUpdate = this.generatedSequence.emails.find(e => e.order === email.order);
      if (emailToUpdate) {
        Object.assign(emailToUpdate, updates);
      }
    }
  }

  // Activar secuencia
  async activateSequence(): Promise<void> {
    if (!this.generatedSequence?.sequenceId) {
      console.error('❌ No sequence ID available');
      return;
    }

    try {
      await this.mailflowService
        .activateSequence(this.generatedSequence.sequenceId)
        .toPromise();

      // Track sequence activation
      this.tracking.moduleActivated('mailflow', {
        sequence_id: this.generatedSequence.sequenceId,
        sequence_name: this.generatedSequence.sequenceName || this.generatedSequence.name,
        total_emails: this.generatedSequence.emails?.length || 0,
        contacts_count: this.step3Form.value.contactsCount,
        source: 'onboarding'
      });

      // ✅ MEJORA UX: Mostrar estado de éxito (USER-CONTROLLED)
      // 1. Cambiar estado a activado (mostrar UI de éxito)
      this.sequenceActivated = true;

      // 2. Guardar flags para modal de validación
      localStorage.setItem('mailflow_show_validation_modal', 'true');
      
      if (this.generatedSequence?.sequenceId) {
        localStorage.setItem('mailflow_validation_sequence_id', this.generatedSequence.sequenceId);
      }

      // 3. ✅ NO AUTO-REDIRECT - Usuario decide cuándo ir al dashboard
      // El botón "Go to Dashboard" es visible y usuario hace click intencional
      // Esto genera señal de engagement real vs navegación pasiva

    } catch (error: any) {
      console.error('Error activating sequence:', error);
      this.generationError = 'Failed to activate sequence. Please try again.';
    }
  }

  // Cerrar modal de validación
  closeValidationModal(): void {
    this.showValidationModal = false;
    // Redirigir al dashboard después de cerrar
    setTimeout(() => {
      this.router.navigate(['/mailflow/dashboard']);
    }, 500);
  }

  // Submitear respuesta de validación
  submitValidation(response: 'yes' | 'maybe' | 'no', comment: string | null): void {
    this.validationResponse = response;
    
    // Track validation response
    this.tracking.track('validation_response', {
      module: 'mailflow',
      response: response,
      sequence_id: this.generatedSequence?.sequenceId,
      price_asked: 19
    });

    // Si hay comentario inmediato, enviarlo
    if (comment) {
      this.validationComment = comment;
      this.submitFeedback();
    }
  }

  // Submitear feedback adicional
  submitFeedback(): void {
    if (!this.validationComment.trim()) {
      this.closeValidationModal();
      return;
    }

    // Track validation feedback
    this.tracking.track('validation_feedback', {
      module: 'mailflow',
      response: this.validationResponse,
      feedback: this.validationComment,
      sequence_id: this.generatedSequence?.sequenceId
    });

    // Cerrar modal y redirigir
    this.closeValidationModal();
  }

  // Obtener primeros 3 contactos para mostrar actividad "live"
  getRecentActivityContacts(): Array<{ name: string; email: string }> {
    return this.previewContacts.slice(0, 3).map(contact => ({
      name: contact.name || contact.email.split('@')[0],
      email: contact.email
    }));
  }

  // Obtener siguiente email en cola (segundo email de la secuencia)
  getNextQueuedEmail() {
    if (!this.generatedSequence?.emails || this.generatedSequence.emails.length < 2) {
      return null;
    }
    return this.generatedSequence.emails[1];
  }

  // Formatear delay para mostrar "in Xh" o "in Xd"
  formatDelay(delayHours: number): string {
    if (delayHours < 24) {
      return `${delayHours}h`;
    }
    const days = Math.round(delayHours / 24);
    return `${days}d`;
  }

  // Toggle expansión de email en preview
  toggleEmailExpanded(index: number): void {
    if (this.expandedEmails.has(index)) {
      this.expandedEmails.delete(index);
    } else {
      this.expandedEmails.add(index);
    }
  }

  // Check si email está expandido
  isEmailExpanded(index: number): boolean {
    return this.expandedEmails.has(index);
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

  // ========== DELIVERY PREVIEW & SMTP VALIDATION METHODS ==========

  /**
   * Validar si se puede activar la sequence
   * Requiere que el usuario haya confirmado que entiende emails reales
   */
  canActivateSequence(): boolean {
    return this.confirmRealRecipientsChecked && this.smtpStatus === 'connected';
  }

  /**
   * Máscarar email para privacidad
   * Ejemplo: john.doe@example.com → j***e@example.com
   */
  maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    const masked = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
    return `${masked}@${domain}`;
  }

  /**
   * Obtener tiempo relativo desde último test SMTP
   */
  getSmtpLastTestRelative(): string {
    const now = new Date();
    const diff = now.getTime() - this.smtpLastTestTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }

  /**
   * Toggle mostrar/ocultar lista de contactos
   */
  toggleContactsList(): void {
    this.showContactsList = !this.showContactsList;
  }

  /**
   * Obtener timeline de envío para el primer día
   */
  getImmediateDeliveryCount(): number {
    if (!this.generatedSequence?.emails) return 0;
    return this.generatedSequence.emails.filter(e => e.delayHours === 0).length;
  }

  /**
   * Obtener timeline de envío para días futuros
   */
  getScheduledDeliveryCount(): number {
    if (!this.generatedSequence?.emails) return 0;
    return this.generatedSequence.emails.filter(e => e.delayHours > 0).length;
  }

  /**
   * Calcular duración total de la sequence en días
   */
  getTotalDurationDays(): number {
    if (!this.generatedSequence?.emails || this.generatedSequence.emails.length === 0) return 0;
    
    const maxDelayHours = Math.max(...this.generatedSequence.emails.map(e => e.delayHours));
    return Math.ceil(maxDelayHours / 24);
  }

  // ========== END DELIVERY PREVIEW METHODS ==========

  /**
   * 💾 Guardar sequenceId en localStorage para MVP público
   * Permite al usuario ver sus sequences sin autenticación
   */
  private saveSequenceIdToLocalStorage(sequenceId: string): void {
    const STORAGE_KEY = 'mailflow_sequences';
    try {
      const existingIds = localStorage.getItem(STORAGE_KEY);
      const idsArray = existingIds ? JSON.parse(existingIds) : [];
      
      // Agregar nuevo ID si no existe
      if (!idsArray.includes(sequenceId)) {
        idsArray.push(sequenceId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(idsArray));
        console.log('💾 Sequence ID saved to localStorage:', sequenceId);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}
