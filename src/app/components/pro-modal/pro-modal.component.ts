import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Pro Modal Component (Soft Gate)
 * 
 * Modal para capturar email de usuarios interesados en Pro
 * sin implementar aún Stripe ni paywall real.
 * 
 * Estrategia Lean: Validar willingness to pay con early access offer
 * 
 * @module components/pro-modal
 */

export interface ProEmailData {
  email: string;
  module: string;
  source: string;
  offer: string;
}

@Component({
  selector: 'app-pro-modal',
  templateUrl: './pro-modal.component.html',
  styleUrls: ['./pro-modal.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProModalComponent {
  
  @Input() module = '';
  @Input() isVisible = false;
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onEmailSubmit = new EventEmitter<ProEmailData>();
  
  emailForm: FormGroup;
  isSubmitting = false;
  isSuccess = false;
  
  constructor(private fb: FormBuilder) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  /**
   * Cerrar modal
   */
  closeModal(): void {
    if (!this.isSubmitting) {
      this.onClose.emit();
      this.resetForm();
    }
  }
  
  /**
   * Submit email
   */
  async submitEmail(): Promise<void> {
    if (this.emailForm.invalid || this.isSubmitting) {
      return;
    }
    
    this.isSubmitting = true;
    
    const emailData: ProEmailData = {
      email: this.emailForm.value.email,
      module: this.module,
      source: 'pro_modal',
      offer: '50_percent_beta'
    };
    
    // Simular delay de API (Lean: sin backend real aún)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.onEmailSubmit.emit(emailData);
    
    this.isSuccess = true;
    this.isSubmitting = false;
    
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
      this.closeModal();
    }, 3000);
  }
  
  /**
   * Reset form state
   */
  private resetForm(): void {
    this.emailForm.reset();
    this.isSuccess = false;
    this.isSubmitting = false;
  }
  
  /**
   * Prevenir cierre al hacer click dentro del modal
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
