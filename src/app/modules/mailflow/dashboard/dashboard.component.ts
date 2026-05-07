import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MailflowService } from '../services/mailflow.service';
import { TrackingService } from '../../../services/tracking.service';

@Component({
  selector: 'app-mailflow-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  sequences: any[] = [];
  loading = false;
  error: string | null = null;
  expandedSequenceId: string | null = null;

  // ✅ NUEVOS: Datos reales del sistema
  isSystemRunning = false;
  totalEmailsSentToday = 0;
  activeSequencesCount = 0;
  totalPendingEmails = 0;
  nextEmailScheduled = '--';
  recentActivity: any[] = [];

  // ✅ SUCCESS BANNER después de activación
  showSuccessBanner = false;
  activatedSequenceName = '';

  // ✅ How It Works Modal
  showHowItWorksModal = false;

  // ✅ VALIDATION MODAL
  showValidationModal = false;
  validationResponse: 'yes' | 'maybe' | 'no' | null = null;
  validationComment = '';

  constructor(
    private mailflowService: MailflowService,
    private router: Router,
    private trackingService: TrackingService
  ) {}

  ngOnInit(): void {
    this.trackingService.track('dashboard_viewed', {});
    this.loadData();
    this.checkForActivationSuccess();

    // ✅ Mostrar modal de validación (1 de cada 3 veces)
    const shouldShowValidation = Math.random() < 0.33;
    if (shouldShowValidation) {
      setTimeout(() => {
        this.showValidationModal = true;
        this.trackingService.track('validation_modal_shown', {});
      }, 3000); // Después de 3 segundos de interacción
    }
  }

  loadData(): void {
    this.loading = true;
    this.mailflowService.listSequences().subscribe({
      next: (response: any) => {
        // Backend devuelve { status: 200, data: [...] }
        this.sequences = response.data || [];
        this.loading = false;

        // ✅ Calcular estadísticas REALES del sistema
        this.calculateSystemStats();
      },
      error: (err: any) => {
        console.error('Error loading sequences:', err);
        this.error = 'Failed to load sequences. Please try again.';
        this.loading = false;
      }
    });
  }

  calculateSystemStats(): void {
    // Contar secuencias activas
    this.activeSequencesCount = this.sequences.filter(s => s.status === 'active').length;
    this.isSystemRunning = this.activeSequencesCount > 0;

    // Calcular emails enviados HOY (simulado por ahora - debería venir del backend)
    this.totalEmailsSentToday = this.sequences.reduce((sum, seq) => sum + (seq.realSent || 0), 0);

    // Total de emails pendientes
    this.totalPendingEmails = this.sequences.reduce((sum, seq) => sum + (seq.realPending || 0), 0);

    // Próximo email programado (simulado)
    if (this.isSystemRunning && this.totalPendingEmails > 0) {
      this.nextEmailScheduled = 'in 12 min'; // Esto debería venir del backend
    } else {
      this.nextEmailScheduled = '--';
    }

    // Actividad reciente (simulado por ahora)
    if (this.isSystemRunning) {
      this.recentActivity = [
        { type: 'sent', icon: '✓', message: 'Email sent to contact #143', time: '2 minutes ago' },
        { type: 'scheduled', icon: '⏳', message: 'Email scheduled for contact #144', time: '8 minutes ago' },
        { type: 'sending', icon: '📤', message: 'Sequence "Onboarding v2" activated', time: '1 hour ago' }
      ];
    } else {
      this.recentActivity = [];
    }
  }

  getSequenceSentCount(sequence: any): number {
    return sequence.realSent || 0;
  }

  getSequenceScheduledCount(sequence: any): number {
    // Emails que tienen `scheduledAt` pero aún no se enviaron
    return sequence.emails?.filter((e: any) => e.scheduledAt && !e.sentAt).length || 0;
  }

  getSequencePendingCount(sequence: any): number {
    return sequence.realPending || 0;
  }

  getNextEmailTime(): string {
    if (!this.isSystemRunning || this.totalPendingEmails === 0) {
      return '--';
    }
    return this.nextEmailScheduled;
  }

  getLastEmailSentTime(): string | null {
    if (this.totalEmailsSentToday === 0) {
      return null;
    }
    return '12 minutes ago'; // Simulado - debería venir del backend
  }

  checkForActivationSuccess(): void {
    const activated = localStorage.getItem('sequenceJustActivated');
    if (activated) {
      this.showSuccessBanner = true;
      this.activatedSequenceName = activated;
      localStorage.removeItem('sequenceJustActivated');

      setTimeout(() => {
        this.showSuccessBanner = false;
      }, 10000);
    }
  }

  viewLastActivatedSequence(): void {
    const lastActivated = this.sequences.find(s => s.status === 'active');
    if (lastActivated) {
      this.viewDetails(lastActivated.sequenceId);
    }
  }

  dismissBanner(): void {
    this.showSuccessBanner = false;
  }

  createNew(): void {
    this.trackingService.track('create_sequence_clicked', {});
    this.router.navigate(['/mailflow/onboarding']);
  }

  activate(id: string): void {
    this.trackingService.track('sequence_activated', { sequenceId: id });
    this.mailflowService.activateSequence(id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error activating sequence:', err);
        this.error = 'Failed to activate sequence';
      }
    });
  }

  pause(id: string): void {
    this.trackingService.track('sequence_paused', { sequenceId: id });
    this.mailflowService.pauseSequence(id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        console.error('Error pausing sequence:', err);
        this.error = 'Failed to pause sequence';
      }
    });
  }

  viewDetails(id: string): void {
    this.trackingService.track('sequence_details_viewed', { sequenceId: id });
    // Toggle panel de detalles inline
    this.expandedSequenceId = this.expandedSequenceId === id ? null : id;
  }

  onCardInteraction(): void {
    // Placeholder para futuras interacciones con las cards
  }

  closeValidationModal(): void {
    this.showValidationModal = false;
    this.trackingService.track('validation_modal_closed', { response: this.validationResponse });
  }

  submitValidation(response: 'yes' | 'maybe' | 'no', comment: string | null): void {
    this.validationResponse = response;

    // Si el usuario hace clic en una respuesta, mostrar el campo de comentarios
    if (!comment) {
      return; // Esperar a que el usuario escriba (o no) un comentario
    }

    // Enviar validación al backend
    this.trackingService.track('validation_submitted', {
      response,
      comment: comment || ''
    });

    this.closeValidationModal();
  }

  submitFeedback(): void {
    if (!this.validationResponse) return;

    this.trackingService.track('validation_submitted', {
      response: this.validationResponse,
      comment: this.validationComment
    });

    this.closeValidationModal();
  }
}
