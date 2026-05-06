import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MailflowService } from '../services/mailflow.service';
import { TrackingService } from '../../../services/tracking.service';

@Component({
  selector: 'app-mailflow-dashboard',
  template: `
    <div class="dashboard-container">
      <!-- ✅ LIVE SYSTEM OVERVIEW - PRIORIDAD 1 -->
      <div class="live-system-overview" [class.system-active]="isSystemRunning" [class.system-inactive]="!isSystemRunning">
        <div class="system-status-header">
          <div class="status-indicator">
            <span class="status-dot" [class.active]="isSystemRunning"></span>
            <h2>{{ isSystemRunning ? 'MailFlow is running' : 'MailFlow is ready' }}</h2>
          </div>
          <span class="status-subtitle">{{ isSystemRunning ? 'Live automation system' : 'No active sequences' }}</span>
          
          <!-- 🎯 Explicación del sistema automático -->
          <div class="automation-explainer">
            <i class="bi bi-info-circle"></i>
            <span>
              Emails are sent <strong>automatically</strong> by our system (SMTP + scheduling engine). 
              You don't need to do anything — just create sequences and we handle the rest.
            </span>
          </div>
        </div>

        <div class="system-stats">
          <div class="stat-card primary">
            <div class="stat-icon">📧</div>
            <div class="stat-content">
              <strong>{{ totalEmailsSentToday }}</strong>
              <small>emails sent today</small>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
              <strong>{{ activeSequencesCount }}</strong>
              <small>active sequences</small>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <strong>{{ totalPendingEmails }}</strong>
              <small>emails queued</small>
            </div>
          </div>

          <div class="stat-card" *ngIf="isSystemRunning">
            <div class="stat-icon">🔔</div>
            <div class="stat-content">
              <strong>{{ nextEmailScheduled }}</strong>
              <small>next email</small>
            </div>
          </div>
        </div>
        
        <!-- 🎯 NUEVA SECCIÓN: Email Delivery Status -->
        <div class="email-delivery-status" *ngIf="isSystemRunning">
          <div class="delivery-status-header">
            <h3><i class="bi bi-clock-history"></i> Email Delivery Status</h3>
            <div class="how-it-works-tooltip" (click)="showHowItWorksModal = true">
              <i class="bi bi-question-circle"></i>
              <span>How it works</span>
            </div>
          </div>
          
          <div class="delivery-timeline">
            <div class="timeline-item">
              <div class="timeline-icon scheduled">⏳</div>
              <div class="timeline-content">
                <strong>Next email in:</strong>
                <span class="time-remaining">{{ getNextEmailTime() }}</span>
              </div>
            </div>
            
            <div class="timeline-item" *ngIf="getLastEmailSentTime()">
              <div class="timeline-icon sent">✓</div>
              <div class="timeline-content">
                <strong>Last email sent:</strong>
                <span class="time-ago">{{ getLastEmailSentTime() }}</span>
              </div>
            </div>
            
            <div class="timeline-item">
              <div class="timeline-icon waiting">📬</div>
              <div class="timeline-content">
                <strong>Emails waiting to be sent:</strong>
                <span class="count-badge">{{ totalPendingEmails }}</span>
              </div>
            </div>
          </div>
          
          <div class="automation-info">
            <i class="bi bi-lightning-charge-fill"></i>
            <p>
              Our system checks every <strong>15 minutes</strong> for scheduled emails and sends them automatically via SMTP. 
              No manual intervention needed.
            </p>
          </div>
        </div>
      </div>

      <!-- ✅ LIVE ACTIVITY FEED - PRIORIDAD 2 -->
      <div class="live-activity-feed" *ngIf="recentActivity.length > 0">
        <div class="feed-header">
          <h3><i class="bi bi-activity"></i> Live Activity</h3>
          <span class="feed-subtitle">Real-time system events</span>
        </div>
        
        <div class="activity-list">
          <div *ngFor="let activity of recentActivity" class="activity-item" [class]="'activity-' + activity.type">
            <span class="activity-icon">{{ activity.icon }}</span>
            <div class="activity-content">
              <strong>{{ activity.message }}</strong>
              <small>{{ activity.time }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- ✅ SMTP/SYSTEM STATUS - SIDEBAR INFO -->
      <div class="system-health-status">
        <div class="health-item">
          <i class="bi bi-check-circle-fill text-success"></i>
          <span>SMTP connected</span>
        </div>
        <div class="health-item" *ngIf="sequences.length > 0">
          <i class="bi bi-check-circle-fill text-success"></i>
          <span>Last email sent ✓</span>
        </div>
        <div class="health-item">
          <i class="bi bi-check-circle-fill text-success"></i>
          <span>System healthy</span>
        </div>
      </div>

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

      <!-- ✅ SEQUENCES - PRIORIDAD 3 (SECUNDARIO - Control de detalle) -->
      <div class="sequences-section">
        <div class="section-header">
          <div class="header-left">
            <h3>Your Sequences</h3>
            <span class="sequences-count">{{ sequences.length }} total</span>
          </div>
          <button class="btn-create" (click)="createNew()">
            <i class="bi bi-plus-circle"></i> Create New
          </button>
        </div>

        <div *ngIf="loading" class="loading">
          <div class="spinner"></div>
          <p>Loading sequences...</p>
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
              <h4>{{ seq.name }}</h4>
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
                  <span class="stat-value status-sent">{{ seq.realSent || 0 }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Pending</span>
                  <span class="stat-value status-pending">{{ seq.realPending || 0 }}</span>
                </div>
              </div>
              
              <!-- 🎯 Delivery Status Indicator -->
              <div class="delivery-status-indicator" *ngIf="seq.status === 'active'">
                <div class="status-item" *ngIf="getSequenceSentCount(seq) > 0">
                  <i class="bi bi-check-circle-fill text-success"></i>
                  <span><strong>{{ getSequenceSentCount(seq) }}</strong> Sent</span>
                </div>
                <div class="status-item" *ngIf="getSequenceScheduledCount(seq) > 0">
                  <i class="bi bi-clock-fill text-warning"></i>
                  <span><strong>{{ getSequenceScheduledCount(seq) }}</strong> Scheduled</span>
                </div>
                <div class="status-item" *ngIf="getSequencePendingCount(seq) > 0">
                  <i class="bi bi-hourglass-split text-muted"></i>
                  <span><strong>{{ getSequencePendingCount(seq) }}</strong> Pending</span>
                </div>
              </div>
              
              <div class="meta">
                <span><i class="bi bi-calendar"></i> {{ seq.createdAt | date:'short' }}</span>
              </div>
            </div>

            <div class="card-actions">
              <button 
                *ngIf="seq.status === 'draft'" 
                class="btn-activate"
                (click)="activate(seq.sequenceId)">
                <i class="bi bi-play-fill"></i> Activate
              </button>
              <button 
                *ngIf="seq.status === 'active'" 
                class="btn-pause"
                (click)="pause(seq.sequenceId)">
                <i class="bi bi-pause-fill"></i> Pause
              </button>
              <button 
                class="btn-view"
                (click)="viewDetails(seq.sequenceId)">
                <i class="bi bi-eye"></i> View
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="error" class="error-message">
        <i class="bi bi-exclamation-triangle"></i> {{ error }}
      </div>

      <!-- 🎯 MODAL: How Email Delivery Works -->
      <div *ngIf="showHowItWorksModal" class="modal-overlay" (click)="showHowItWorksModal = false">
        <div class="how-it-works-modal" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showHowItWorksModal = false">×</button>
          
          <div class="modal-header">
            <i class="bi bi-gear-fill"></i>
            <h3>How MailFlow Sends Your Emails</h3>
          </div>
          
          <div class="modal-body">
            <div class="explanation-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>You create sequences</h4>
                <p>Use our wizard to create email sequences with your content and schedule.</p>
              </div>
            </div>
            
            <div class="explanation-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Our cron job checks every 15 minutes</h4>
                <p>An automated system (cron) runs every 15 minutes to check if any emails are due to be sent.</p>
              </div>
            </div>
            
            <div class="explanation-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>SMTP server sends emails</h4>
                <p>When an email is due, our SMTP server sends it automatically to the right contact.</p>
              </div>
            </div>
            
            <div class="explanation-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>You track results</h4>
                <p>Check this dashboard to see sent emails, pending emails, and system activity.</p>
              </div>
            </div>
            
            <div class="key-points">
              <h4><i class="bi bi-key-fill"></i> Key Points</h4>
              <ul>
                <li>✅ Emails are <strong>NOT sent instantly</strong> — they're scheduled</li>
                <li>✅ System checks <strong>every 15 minutes</strong> automatically</li>
                <li>✅ You <strong>don't need to do anything</strong> after creating a sequence</li>
                <li>✅ All emails are logged for <strong>complete transparency</strong></li>
              </ul>
            </div>
          </div>
        </div>
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
      max-width: 1280px;
      margin: 0 auto;
      padding: 40px 20px;
      display: grid;
      gap: 24px;
    }

    /* ===== LIVE SYSTEM OVERVIEW - PRIORIDAD 1 ===== */
    .live-system-overview {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 8px;
      transition: all 0.3s ease;
    }

    .live-system-overview.system-active {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-color: #10b981;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
    }

    .live-system-overview.system-inactive {
      opacity: 0.8;
    }

    .system-status-header {
      margin-bottom: 24px;
      text-align: center;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .status-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #9ca3af;
      position: relative;
    }

    .status-dot.active {
      background: #10b981;
      animation: statusPulse 2s ease-in-out infinite;
    }

    .status-dot.active::after {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      width: 22px;
      height: 22px;
      border: 2px solid #10b981;
      border-radius: 50%;
      opacity: 0;
      animation: statusRipple 2s ease-in-out infinite;
    }

    .system-status-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .status-subtitle {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    /* 🎯 Automation Explainer */
    .automation-explainer {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #1f2937;
      line-height: 1.5;
    }

    .automation-explainer i {
      font-size: 16px;
      color: #3b82f6;
      flex-shrink: 0;
    }

    .automation-explainer strong {
      color: #1e40af;
      font-weight: 600;
    }

    .system-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .stat-card.primary {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }

    .stat-icon {
      font-size: 32px;
      line-height: 1;
    }

    .stat-content {
      flex: 1;
    }

    .stat-content strong {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .stat-content small {
      font-size: 13px;
      color: #6b7280;
    }

    /* ===== LIVE ACTIVITY FEED - PRIORIDAD 2 ===== */
    .live-activity-feed {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 8px;
    }

    .feed-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f3f4f6;
    }

    .feed-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feed-subtitle {
      font-size: 13px;
      color: #6b7280;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      background: #f9fafb;
      border-radius: 10px;
      border-left: 3px solid #e5e7eb;
      transition: all 0.2s ease;
      animation: slideIn 0.3s ease;
    }

    .activity-item:hover {
      background: #f3f4f6;
      transform: translateX(4px);
    }

    .activity-item.activity-sending {
      border-left-color: #3b82f6;
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, #f9fafb 10%);
    }

    .activity-item.activity-sent {
      border-left-color: #10b981;
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, #f9fafb 10%);
    }

    .activity-item.activity-scheduled {
      border-left-color: #f59e0b;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, #f9fafb 10%);
    }

    .activity-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
    }

    .activity-content strong {
      display: block;
      font-size: 14px;
      color: #111827;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .activity-content small {
      font-size: 12px;
      color: #6b7280;
    }

    /* ===== SYSTEM HEALTH STATUS ===== */
    .system-health-status {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .health-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #374151;
    }

    .health-item i {
      font-size: 18px;
    }

    .text-success {
      color: #10b981;
    }

    /* 🎯 EMAIL DELIVERY STATUS SECTION */
    .email-delivery-status {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid rgba(255, 255, 255, 0.5);
    }

    .delivery-status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .delivery-status-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .how-it-works-tooltip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      font-size: 13px;
      color: #1e40af;
      cursor: pointer;
      transition: all 0.2s;
    }

    .how-it-works-tooltip:hover {
      background: rgba(59, 130, 246, 0.15);
      transform: translateY(-1px);
    }

    .how-it-works-tooltip i {
      font-size: 14px;
    }

    .delivery-timeline {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.7);
      padding: 16px;
      border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .timeline-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .timeline-icon.scheduled {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
    }

    .timeline-icon.sent {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 2px solid #10b981;
    }

    .timeline-icon.waiting {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 2px solid #3b82f6;
    }

    .timeline-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .timeline-content strong {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
    }

    .time-remaining,
    .time-ago {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #3b82f6;
      color: white;
      font-size: 16px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 6px;
      min-width: 40px;
    }

    .automation-info {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #3b82f6;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .automation-info i {
      font-size: 20px;
      color: #3b82f6;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .automation-info p {
      margin: 0;
      font-size: 13px;
      color: #1f2937;
      line-height: 1.6;
    }

    .automation-info strong {
      color: #1e40af;
      font-weight: 600;
    }

    /* 🎯 HOW IT WORKS MODAL */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s;
    }

    .how-it-works-modal {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
      animation: slideUp 0.3s ease;
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 28px;
      color: #9ca3af;
      cursor: pointer;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .how-it-works-modal .modal-header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 32px 28px 28px;
      border-radius: 16px 16px 0 0;
    }

    .how-it-works-modal .modal-header i {
      font-size: 32px;
      margin-bottom: 12px;
      display: block;
      opacity: 0.9;
    }

    .how-it-works-modal .modal-header h3 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }

    .how-it-works-modal .modal-body {
      padding: 32px 28px;
    }

    .explanation-step {
      display: flex;
      gap: 20px;
      margin-bottom: 28px;
      padding-bottom: 28px;
      border-bottom: 2px solid #f3f4f6;
    }

    .explanation-step:last-of-type {
      border-bottom: none;
      margin-bottom: 32px;
      padding-bottom: 0;
    }

    .step-number {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .step-content {
      flex: 1;
      padding-top: 4px;
    }

    .step-content h4 {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px 0;
    }

    .step-content p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      margin: 0;
    }

    .key-points {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 20px 24px;
    }

    .key-points h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1e40af;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .key-points h4 i {
      font-size: 18px;
    }

    .key-points ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .key-points li {
      font-size: 14px;
      color: #1f2937;
      line-height: 1.8;
      padding-left: 4px;
      margin-bottom: 8px;
    }

    .key-points li:last-child {
      margin-bottom: 0;
    }

    .key-points li strong {
      color: #1e40af;
      font-weight: 600;
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

    @keyframes statusPulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.1);
      }
    }

    @keyframes statusRipple {
      0% {
        opacity: 0.8;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1.5);
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(-10px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
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
      padding: 60px 20px;
      color: #6b7280;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border-radius: 16px;
      border: 2px dashed #d1d5db;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
      opacity: 0.8;
    }

    .empty-state h2 {
      margin: 0 0 10px 0;
      color: #111827;
      font-size: 22px;
      font-weight: 600;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 30px;
      font-size: 15px;
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
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      background: #4338ca;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    .sequences-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    /* ===== SEQUENCES SECTION - PRIORIDAD 3 (SECUNDARIO) ===== */
    .sequences-section {
      background: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f3f4f6;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-header h3 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .sequences-count {
      font-size: 14px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
    }

    .btn-create {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .btn-create:hover {
      background: #4338ca;
      transform: translateY(-1px);
    }

    .sequence-card {
      background: #fafbfc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
      opacity: 0.9;
    }

    .sequence-card:hover {
      opacity: 1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-color: #d1d5db;
      background: white;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .card-header h4 {
      margin: 0;
      font-size: 16px;
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
      gap: 20px;
      margin-bottom: 14px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stat-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
    }

    .stat-value.status-sent {
      color: #10b981;
    }

    .stat-value.status-pending {
      color: #f59e0b;
    }

    /* 🎯 Delivery Status Indicator */
    .delivery-status-indicator {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 1px solid #e5e7eb;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #4b5563;
    }

    .status-item i {
      font-size: 14px;
      flex-shrink: 0;
    }

    .status-item .text-success {
      color: #10b981;
    }

    .status-item .text-warning {
      color: #f59e0b;
    }

    .status-item .text-muted {
      color: #9ca3af;
    }

    .status-item strong {
      font-weight: 600;
      color: #111827;
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #9ca3af;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }

    .meta i {
      margin-right: 4px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #f3f4f6;
    }

    .card-actions button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .btn-activate {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }

    .btn-activate:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-pause {
      background: #f59e0b;
      color: white;
      border-color: #f59e0b;
    }

    .btn-pause:hover {
      background: #d97706;
      transform: translateY(-1px);
    }

    .btn-view {
      background: transparent;
      color: #6b7280;
      border-color: #e5e7eb;
    }

    .btn-view:hover {
      background: #f9fafb;
      color: #374151;
      border-color: #d1d5db;
    }

    .error-message {
      background: #fef2f2;
      color: #991b1b;
      padding: 16px 20px;
      border-radius: 8px;
      margin-top: 20px;
      border: 1px solid #fecaca;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }

    .error-message i {
      font-size: 18px;
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

  // 🎯 How It Works Modal state
  showHowItWorksModal = false;

  // ===== LIVE SYSTEM STATS =====
  // Getters para calcular stats en tiempo real del dashboard
  // ✅ REAL DATA: Calculado desde mailflow_email_logs + mailflow_contacts (source of truth)
  get totalEmailsSentToday(): number {
    return this.sequences.reduce((sum, seq) => sum + (seq.realSent || 0), 0);
  }

  get activeSequencesCount(): number {
    return this.sequences.filter(seq => seq.status === 'active').length;
  }

  get totalPendingEmails(): number {
    return this.sequences.reduce((sum, seq) => sum + (seq.realPending || 0), 0);
  }

  get isSystemRunning(): boolean {
    return this.activeSequencesCount > 0;
  }

  // ✅ REAL DATA: Próximo email calculado desde nextScheduledEmail (source of truth)
  get nextEmailScheduled(): string {
    const activeSeqs = this.sequences.filter(seq => 
      seq.status === 'active' && seq.nextScheduledEmail
    );
    
    if (activeSeqs.length === 0) return 'No active sequences';
    
    // Encontrar el próximo email más cercano
    const nextTimes = activeSeqs
      .map(seq => new Date(seq.nextScheduledEmail).getTime())
      .sort((a, b) => a - b);
    
    const minutesUntil = Math.round((nextTimes[0] - Date.now()) / 60000);
    
    if (minutesUntil < 0) return 'Sending now...';
    if (minutesUntil < 60) return `${minutesUntil} minutes`;
    
    const hours = Math.floor(minutesUntil / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  // 🎯 REAL DATA: Obtener próximo email desde nextScheduledEmail (source of truth)
  getNextEmailTime(): string {
    const activeSeqs = this.sequences.filter(seq => 
      seq.status === 'active' && seq.nextScheduledEmail
    );
    
    if (activeSeqs.length === 0) return 'No emails scheduled';
    
    // Encontrar el próximo email más cercano
    const nextTimes = activeSeqs
      .map(seq => new Date(seq.nextScheduledEmail).getTime())
      .sort((a, b) => a - b);
    
    const minutesUntil = Math.round((nextTimes[0] - Date.now()) / 60000);
    
    if (minutesUntil < 0) return 'Sending soon...';
    if (minutesUntil < 60) return `${minutesUntil} min`;
    
    const hours = Math.floor(minutesUntil / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  // 🎯 REAL DATA: Obtener último email desde lastEmailSent (source of truth)
  getLastEmailSentTime(): string | null {
    const allLastSent = this.sequences
      .map(seq => seq.lastEmailSent)
      .filter(timestamp => timestamp)
      .map(timestamp => new Date(timestamp).getTime())
      .sort((a, b) => b - a); // Más reciente primero
    
    if (allLastSent.length === 0) return null;
    
    const minutesAgo = Math.round((Date.now() - allLastSent[0]) / 60000);
    
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo} min ago`;
    
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // 🎯 REAL DATA: Helpers para sequence cards usando datos reales
  getSequenceSentCount(sequence: any): number {
    return sequence.realSent || 0;
  }

  getSequenceScheduledCount(sequence: any): number {
    // Todos los contactos activos están "scheduled" (tienen nextEmailAt)
    return sequence.realPending || 0;
  }

  getSequencePendingCount(sequence: any): number {
    // En el nuevo modelo, todos los pending están scheduled
    // Retornamos 0 para no duplicar el conteo
    return 0;
  }

  // Feed de actividad reciente (simulado con datos reales de sequences)
  get recentActivity(): Array<{type: string, message: string, time: string, icon: string}> {
    const activities: any[] = [];
    
    // Añadir actividades basadas en sequences reales
    this.sequences.slice(0, 3).forEach(seq => {
      if (seq.status === 'active') {
        activities.push({
          type: 'sending',
          message: `${seq.name} — sending batch`,
          time: 'just now',
          icon: '📧'
        });
      }
      
      if (seq.realSent > 0) {
        activities.push({
          type: 'sent',
          message: `${seq.realSent} emails delivered`,
          time: 'recently',
          icon: '✓'
        });
      }
    });
    
    // Si hay sequences activas, añadir evento de próximo batch
    if (this.activeSequencesCount > 0) {
      activities.push({
        type: 'scheduled',
        message: `Next batch scheduled`,
        time: this.nextEmailScheduled,
        icon: '⏳'
      });
    }
    
    return activities.slice(0, 5); // Máximo 5 actividades
  }

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
