import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MailflowService } from '../services/mailflow.service';

@Component({
  selector: 'app-mailflow-dashboard',
  template: `
    <div class="dashboard-container">
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
        <div *ngFor="let seq of sequences" class="sequence-card">
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
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
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
  `]
})
export class DashboardComponent implements OnInit {
  sequences: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private mailflowService: MailflowService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSequences();
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
    this.mailflowService.activateSequence(sequenceId).subscribe({
      next: () => {
        this.loadSequences();
      },
      error: (err: any) => {
        console.error('Error activating sequence:', err);
        this.error = 'Failed to activate sequence.';
      }
    });
  }

  pause(sequenceId: string) {
    this.mailflowService.pauseSequence(sequenceId).subscribe({
      next: () => {
        this.loadSequences();
      },
      error: (err: any) => {
        console.error('Error pausing sequence:', err);
        this.error = 'Failed to pause sequence.';
      }
    });
  }

  viewDetails(sequenceId: string) {
    // TODO: Implementar vista de detalles en el futuro
    console.log('View details:', sequenceId);
  }
}
