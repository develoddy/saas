import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MailflowService } from '../services/mailflow.service';
import { TrackingService } from '../../../services/tracking.service';

@Component({
  selector: 'app-mailflow-dashboard',
  template: `
    <div class="dashboard-container">
      <!-- ✅ BANNER DE CONFIRMACIÓN: Aparece cuando el usuario viene del wizard -->
      <div *ngIf="showSuccessBanner" class="success-banner">
        <div class="banner-content">
          <div class="banner-icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="banner-message">
            <strong>Your sequence is live and sending emails!</strong>
            <p>{{ activatedSequenceName }} is now running automatically</p>
          </div>
          <div class="banner-actions">
            <button class="btn-banner-action" (click)="viewLastActivatedSequence()">
              <i class="bi bi-eye"></i> View Details
            </button>
            <button class="btn-banner-secondary" (click)="createNew()">
              <i class="bi bi-plus-circle"></i> Create Another
            </button>
            <button class="btn-banner-close" (click)="dismissBanner()">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="header">
        <h1>Your Email Sequences</h1>
        <button class="btn-create" (click)="createNew()">
          + Create New Sequence
        </button>
      </div>
      
      <div *ngIf="loading" class="loading">
        Loading sequences...
      </div>

      <div *ngIf="!loading && sequences.length === 0" class="empty-state">
        <div class="empty-icon">📧</div>
        <h2>No sequences yet</h2>
        <p>Create your first email sequence to start automating your onboarding</p>
        <button class="btn-primary" (click)="createNew()">
          Create Your First Sequence
        </button>
      </div>

      <div class="sequences-grid" *ngIf="!loading && sequences.length > 0">
        <div *ngFor="let seq of sequences" class="sequence-card" (click)="onCardInteraction()">
          <div class="card-header">
            <h3>{{ seq.name }}</h3>
            <span class="status-badge" [class]="'status-' + seq.status">
              {{ seq.status }}
            </span>
          </div>
          
          <div class="card-body">
            <div class="stats-row">
              <div class="stat">
                <span class="stat-label">Emails</span>
                <span class="stat-value">{{ seq.emails?.length || 0 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Sent</span>
                <span class="stat-value">{{ seq.stats?.sent || 0 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Pending</span>
                <span class="stat-value">{{ seq.stats?.pending || 0 }}</span>
              </div>
            </div>
            
            <div class="meta">
              <span>Created: {{ seq.createdAt | date:'short' }}</span>
              <span *ngIf="seq.activatedAt">
                Activated: {{ seq.activatedAt | date:'short' }}
              </span>
            </div>
          </div>

          <div class="card-actions">
            <button 
              *ngIf="seq.status === 'draft'" 
              class="btn-activate"
              (click)="activate(seq.sequenceId)">
              Activate
            </button>
            <button 
              *ngIf="seq.status === 'active'" 
              class="btn-pause"
              (click)="pause(seq.sequenceId)">
              Pause
            </button>
            <button 
              class="btn-view"
              (click)="viewDetails(seq.sequenceId)">
              View Details
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>

      <!-- ✅ VALIDATION MODAL - Aparece ENCIMA del dashboard (no bloqueante) -->
      <div *ngIf="showValidationModal" class="validation-modal-overlay" (click)="closeValidationModal()">
        <div class="validation-modal" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="closeValidationModal()">×</button>
          
          <div class="modal-header">
            <h3>💡 Quick Question</h3>
            <p>Help us understand what matters to you</p>
          </div>

          <div class="modal-body">
            <div class="question">
              <strong>Would you pay $19/month for MailFlow?</strong>
              <p class="question-subtitle">
                Unlimited sequences, unlimited contacts, advanced analytics, and priority support
              </p>
            </div>

            <div class="response-buttons">
              <button class="response-btn yes" (click)="submitValidation('yes', null)">
                <i class="bi bi-check-circle-fill"></i>
                <span>Yes, I'd pay</span>
              </button>
              
              <button class="response-btn maybe" (click)="submitValidation('maybe', null)">
                <i class="bi bi-question-circle-fill"></i>
                <span>Maybe, depends on features</span>
              </button>
              
              <button class="response-btn no" (click)="submitValidation('no', null)">
                <i class="bi bi-x-circle-fill"></i>
                <span>No, I'd use free alternatives</span>
              </button>
            </div>

            <div class="feedback-section" *ngIf="validationResponse">
              <label for="validationComment">
                Want to tell us more? (optional)
              </label>
              <textarea 
                id="validationComment"
                [(ngModel)]="validationComment"
                placeholder="What would make you more likely to pay? What features are missing?"
                rows="3"
                class="feedback-textarea"></textarea>
              
              <button class="btn btn-primary btn-sm" (click)="submitFeedback()">
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* ✅ SUCCESS BANNER */
    .success-banner {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 32px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
      animation: slideDown 0.4s ease;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .banner-icon {
      font-size: 32px;
      line-height: 1;
    }

    .banner-message {
      flex: 1;
    }

    .banner-message strong {
      display: block;
      font-size: 18px;
      margin-bottom: 4px;
    }

    .banner-message p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .banner-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .btn-banner-action {
      background: white;
      color: #059669;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-banner-action:hover {
      background: #f0fdf4;
      transform: translateY(-1px);
    }

    .btn-banner-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-banner-secondary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .btn-banner-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .btn-banner-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @keyframes slideDown {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }

    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }

    .btn-create {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-create:hover {
      background: #4338ca;
    }

    .loading {
      text-align: center;
      padding: 60px;
      color: #6b7280;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 2px dashed #e5e7eb;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .empty-state h2 {
      margin: 0 0 10px 0;
      color: #111827;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 30px;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .sequences-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .sequence-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      transition: box-shadow 0.2s;
    }

    .sequence-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
    }

    .card-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      flex: 1;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-draft {
      background: #f3f4f6;
      color: #6b7280;
    }

    .status-active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-paused {
      background: #fef3c7;
      color: #92400e;
    }

    .status-completed {
      background: #dbeafe;
      color: #1e40af;
    }

    .stats-row {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 500;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #6b7280;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }

    .card-actions button {
      flex: 1;
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-activate {
      background: #10b981;
      color: white;
    }

    .btn-activate:hover {
      background: #059669;
    }

    .btn-pause {
      background: #f59e0b;
      color: white;
    }

    .btn-pause:hover {
      background: #d97706;
    }

    .btn-view {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-view:hover {
      background: #e5e7eb;
    }

    .error-message {
      background: #fef2f2;
      color: #991b1b;
      padding: 16px;
      border-radius: 8px;
      margin-top: 20px;
      border: 1px solid #fecaca;
    }

    /* ✅ VALIDATION MODAL STYLES */
    .validation-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    .validation-modal {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      padding: 32px;
      position: relative;
      animation: slideUp 0.3s ease;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: #9ca3af;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
    }

    .modal-close:hover {
      color: #374151;
    }

    .modal-header {
      margin-bottom: 24px;
    }

    .modal-header h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #111827;
    }

    .modal-header p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }

    .question {
      margin-bottom: 24px;
    }

    .question strong {
      font-size: 18px;
      color: #111827;
      display: block;
      margin-bottom: 8px;
    }

    .question-subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }

    .response-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .response-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .response-btn i {
      font-size: 20px;
    }

    .response-btn span {
      font-weight: 500;
      font-size: 15px;
    }

    .response-btn:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    .response-btn.yes:hover {
      border-color: #10b981;
      background: #d1fae5;
    }

    .response-btn.yes:hover i {
      color: #10b981;
    }

    .response-btn.maybe:hover {
      border-color: #f59e0b;
      background: #fef3c7;
    }

    .response-btn.maybe:hover i {
      color: #f59e0b;
    }

    .response-btn.no:hover {
      border-color: #ef4444;
      background: #fee2e2;
    }

    .response-btn.no:hover i {
      color: #ef4444;
    }

    .feedback-section {
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
    }

    .feedback-section label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-weight: 500;
      font-size: 14px;
    }

    .feedback-textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      font-family: inherit;
      margin-bottom: 12px;
      box-sizing: border-box;
    }

    .feedback-textarea:focus {
      outline: none;
      border-color: #6366f1;
    }

    .btn-sm {
      width: 100%;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  sequences: any[] = [];
  loading = false;
  error: string | null = null;

  // ✅ Success banner state (aparece cuando vienen del wizard)
  showSuccessBanner = false;
  activatedSequenceName = '';
  lastActivatedSequenceId: string | null = null;

  // ✅ Validation modal state
  showValidationModal = false;
  validationResponse: 'yes' | 'maybe' | 'no' | null = null;
  validationComment = '';
  validationSequenceId: string | null = null;

  // ✅ Engagement tracking (value perception detection)
  private engagementDetected = false;
  private validationModalTriggered = false;
  private fallbackTimer: any = null;

  constructor(
    private mailflowService: MailflowService,
    private router: Router,
    private tracking: TrackingService
  ) {}

  ngOnInit() {
    this.loadSequences();
    
    // ✅ MEJORA UX: Detectar si debe mostrar modal de validación
    // El modal se muestra DESPUÉS de cargar sequences (usuario ve valor primero)
    this.checkValidationModal();
    
    // ✅ MEJORA UX: Detectar si debe mostrar banner de éxito
    this.checkSuccessBanner();
  }

  /**
   * ✅ ENGAGEMENT-BASED TRIGGER SYSTEM
   * Modal aparece SOLO cuando usuario ha percibido valor real
   * Detecta interacciones significativas en lugar de usar timers fijos
   */
  private checkValidationModal(): void {
    const shouldShowModal = localStorage.getItem('mailflow_show_validation_modal');
    
    if (shouldShowModal === 'true') {
      // Obtener sequenceId para tracking
      this.validationSequenceId = localStorage.getItem('mailflow_validation_sequence_id');
      
      // ✅ ESTRATEGIA: Esperar engagement real antes de mostrar modal
      // Esto asegura que el usuario YA vio valor antes de responder pricing
      
      // Limpiar flag inmediatamente (evitar múltiples triggers)
      localStorage.removeItem('mailflow_show_validation_modal');
      
      // ✅ FALLBACK: Si no hay engagement en 15s, mostrar igual
      // Esto previene que usuarios pasivos nunca vean el modal
      this.fallbackTimer = setTimeout(() => {
        if (!this.validationModalTriggered) {
          console.log('📊 [Validation] Triggered by fallback timer (15s)');
          this.triggerValidationModal('fallback_timer');
        }
      }, 15000);
      
      // El modal se mostrará cuando detectemos engagement (ver métodos activate/pause/viewDetails)
    }
  }

  /**
   * ✅ TRIGGER CENTRAL DEL MODAL
   * Llamado cuando detectamos engagement real
   */
  private triggerValidationModal(source: 'card_interaction' | 'view_details' | 'pause' | 'activate' | 'fallback_timer'): void {
    if (this.validationModalTriggered) return; // Ya se mostró
    
    this.validationModalTriggered = true;
    this.engagementDetected = true;
    
    // Cancelar fallback timer si existe
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
    
    // Track el momento exacto y origen del trigger
    this.tracking.track('validation_modal_triggered', {
      module: 'mailflow',
      trigger_source: source,
      sequence_id: this.validationSequenceId,
      time_to_trigger: Date.now() // Podemos calcular tiempo desde llegada al dashboard
    });
    
    console.log(`📊 [Validation] Modal triggered by: ${source}`);
    
    // Pequeño delay para que la acción del usuario se complete visualmente
    setTimeout(() => {
      this.showValidationModal = true;
    }, 500);
  }

  /**
   * ✅ DETECTOR DE ENGAGEMENT
   * Marca que el usuario interactuó significativamente con el dashboard
   */
  private markEngagement(action: string): void {
    if (!this.engagementDetected) {
      this.engagementDetected = true;
      console.log(`✅ [Engagement] Detected: ${action}`);
    }
  }

  /**
   * ✅ NUEVA LÓGICA: Detectar si debe mostrar banner de éxito
   * Se muestra cuando el usuario viene del wizard después de activar
   */
  private checkSuccessBanner(): void {
    const sequenceId = localStorage.getItem('mailflow_validation_sequence_id');
    
    if (sequenceId) {
      this.lastActivatedSequenceId = sequenceId;
      
      // Buscar el nombre de la sequence en la lista
      // (se mostrará cuando se carguen las sequences)
      setTimeout(() => {
        const sequence = this.sequences.find(s => s.sequenceId === sequenceId);
        if (sequence) {
          this.activatedSequenceName = sequence.name || 'Your sequence';
          this.showSuccessBanner = true;
          
          // Auto-ocultar después de 10 segundos
          setTimeout(() => {
            this.showSuccessBanner = false;
          }, 10000);
        }
      }, 1000);
    }
  }

  /**
   * Cerrar el banner de éxito manualmente
   */
  dismissBanner(): void {
    this.showSuccessBanner = false;
  }

  /**
   * Ver detalles de la última sequence activada
   */
  viewLastActivatedSequence(): void {
    if (this.lastActivatedSequenceId) {
      this.viewDetails(this.lastActivatedSequenceId);
    }
    this.showSuccessBanner = false;
  }

  loadSequences() {
    this.loading = true;
    this.error = null;

    this.mailflowService.listSequences().subscribe({
      next: (res: any) => {
        this.sequences = res.data || res || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading sequences:', err);
        this.error = 'Failed to load sequences. Please try again.';
        this.loading = false;
      }
    });
  }

  createNew() {
    this.router.navigate(['/mailflow/onboarding']);
  }

  activate(sequenceId: string) {
    // ✅ ENGAGEMENT DETECTION: Usuario activa una sequence
    this.markEngagement('activate_sequence');
    
    // ✅ Feedback visual inmediato: cambiar estado localmente
    const sequence = this.sequences.find(s => s.sequenceId === sequenceId);
    if (sequence) {
      sequence.status = 'active';
      
      // Mostrar mensaje de feedback
      this.showSuccessMessage('Sequence activated successfully');
    }

    // ✅ TRIGGER: Activar sequence = engagement claro
    // Usuario entendió el valor y está tomando acción
    if (!this.validationModalTriggered) {
      this.triggerValidationModal('activate');
    }

    this.mailflowService.activateSequence(sequenceId).subscribe({
      next: () => {
        // Recargar para sincronizar con backend
        this.loadSequences();
      },
      error: (err: any) => {
        console.error('Error activating sequence:', err);
        this.error = 'Failed to activate sequence.';
        // Revertir cambio local en caso de error
        if (sequence) {
          sequence.status = 'draft';
        }
      }
    });
  }

  pause(sequenceId: string) {
    // ✅ ENGAGEMENT DETECTION: Usuario pausa una sequence
    this.markEngagement('pause_sequence');
    
    // ✅ Feedback visual inmediato: cambiar estado localmente
    const sequence = this.sequences.find(s => s.sequenceId === sequenceId);
    if (sequence) {
      sequence.status = 'paused';
      
      // Mostrar mensaje de feedback
      this.showSuccessMessage('Sequence paused successfully');
    }

    // ✅ TRIGGER: Pausar sequence = engagement claro
    // Usuario está controlando activamente su automation
    if (!this.validationModalTriggered) {
      this.triggerValidationModal('pause');
    }

    this.mailflowService.pauseSequence(sequenceId).subscribe({
      next: () => {
        // Recargar para sincronizar con backend
        this.loadSequences();
      },
      error: (err: any) => {
        console.error('Error pausing sequence:', err);
        this.error = 'Failed to pause sequence.';
        // Revertir cambio local en caso de error
        if (sequence) {
          sequence.status = 'active';
        }
      }
    });
  }

  viewDetails(sequenceId: string) {
    // ✅ ENGAGEMENT DETECTION: Usuario explora detalles
    this.markEngagement('view_details');
    
    // ✅ Vista básica de detalles (MVP)
    const sequence = this.sequences.find(s => s.sequenceId === sequenceId);
    
    if (!sequence) {
      console.warn('Sequence not found:', sequenceId);
      return;
    }

    // Por ahora, mostrar un alert con información básica
    // TODO: Implementar modal o página dedicada en el futuro
    const details = `
📧 ${sequence.name}

Status: ${sequence.status}
Emails in sequence: ${sequence.emails?.length || 0}
Total sent: ${sequence.stats?.sent || 0}
Pending: ${sequence.stats?.pending || 0}

Created: ${new Date(sequence.createdAt).toLocaleDateString()}
${sequence.activatedAt ? 'Activated: ' + new Date(sequence.activatedAt).toLocaleDateString() : 'Not activated yet'}
    `.trim();

    alert(details);
    
    // ✅ TRIGGER: Ver detalles = engagement claro
    // Usuario está explorando activamente su sequence
    if (!this.validationModalTriggered) {
      this.triggerValidationModal('view_details');
    }
    
    // Track event
    this.tracking.track('sequence_details_viewed', {
      module: 'mailflow',
      sequence_id: sequenceId,
      sequence_name: sequence.name
    });
  }

  /**
   * ✅ ENGAGEMENT DETECTOR: Usuario interactuó con una card
   * Llamado desde el template cuando hay click/hover en una card
   */
  onCardInteraction(): void {
    this.markEngagement('card_interaction');
    
    // ✅ TRIGGER: Interacción con card = usuario está explorando
    // Esto indica que el usuario está viendo y entendiendo sus sequences
    if (!this.validationModalTriggered) {
      this.triggerValidationModal('card_interaction');
    }
  }

  /**
   * Mostrar mensaje de éxito temporal
   */
  private showSuccessMessage(message: string): void {
    // Implementación simple usando error como canal de feedback
    // TODO: Implementar un sistema de notificaciones toast
    const originalError = this.error;
    this.error = null;
    
    // Mostrar mensaje temporal en consola por ahora
    console.log('✅', message);
  }

  // ✅ VALIDATION MODAL METHODS

  /**
   * Cerrar modal de validación
   * NO redirige (ya estamos en el dashboard)
   */
  closeValidationModal(): void {
    this.showValidationModal = false;
    // Limpiar sequenceId temporal
    localStorage.removeItem('mailflow_validation_sequence_id');
  }

  /**
   * Submitear respuesta de validación
   */
  submitValidation(response: 'yes' | 'maybe' | 'no', comment: string | null): void {
    this.validationResponse = response;
    
    // Track validation response
    this.tracking.track('validation_response', {
      module: 'mailflow',
      response: response,
      sequence_id: this.validationSequenceId,
      price_asked: 19,
      source: 'dashboard'
    });

    // Si hay comentario inmediato, enviarlo
    if (comment) {
      this.validationComment = comment;
      this.submitFeedback();
    }
  }

  /**
   * Submitear feedback adicional
   */
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
      sequence_id: this.validationSequenceId,
      source: 'dashboard'
    });

    // Cerrar modal (ya estamos en dashboard, no hay redirección)
    this.closeValidationModal();
  }
}
