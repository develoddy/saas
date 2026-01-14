import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TenantProfile } from '../../../core/saas.service';

@Component({
  selector: 'app-trial-banner',
  templateUrl: './trial-banner.component.html',
  styleUrls: ['./trial-banner.component.scss']
})
export class TrialBannerComponent implements OnInit {
  @Input() tenant: TenantProfile | null = null;
  
  isDismissed: boolean = false;
  isMinimized: boolean = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Check if banner was dismissed in this session
    const dismissKey = `trial_banner_dismissed_${this.tenant?.id}`;
    this.isDismissed = sessionStorage.getItem(dismissKey) === 'true';
    
    // Check if banner was minimized
    const minimizeKey = `trial_banner_minimized_${this.tenant?.id}`;
    this.isMinimized = localStorage.getItem(minimizeKey) === 'true';
  }

  get daysRemaining(): number {
    return this.tenant?.days_remaining || 0;
  }

  get isExpiringSoon(): boolean {
    return this.daysRemaining <= 3 && this.daysRemaining > 0;
  }

  get isExpiredToday(): boolean {
    return this.daysRemaining === 0;
  }

  get progressPercentage(): number {
    if (!this.tenant?.trial_ends_at) return 0;
    
    const trialDays = 14; // Días totales del trial
    const remaining = this.daysRemaining;
    return Math.max(0, Math.min(100, ((trialDays - remaining) / trialDays) * 100));
  }

  get urgencyLevel(): 'info' | 'warning' | 'urgent' {
    if (this.daysRemaining <= 1) return 'urgent';
    if (this.daysRemaining <= 3) return 'warning';
    return 'info';
  }

  dismiss(): void {
    this.isDismissed = true;
    const dismissKey = `trial_banner_dismissed_${this.tenant?.id}`;
    sessionStorage.setItem(dismissKey, 'true');
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    const minimizeKey = `trial_banner_minimized_${this.tenant?.id}`;
    localStorage.setItem(minimizeKey, this.isMinimized.toString());
  }

  navigateToUpgrade(): void {
    this.router.navigate(['/upgrade']);
  }

  getTrialEndDate(): string {
    if (!this.tenant?.trial_ends_at) return '';
    
    const date = new Date(this.tenant.trial_ends_at);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getMessage(): string {
    const days = this.daysRemaining;
    
    if (days === 0) {
      return 'Tu prueba gratuita finaliza hoy';
    } else if (days === 1) {
      return 'Te queda 1 día de prueba gratuita';
    } else if (days <= 3) {
      return `Te quedan ${days} días de prueba gratuita`;
    } else {
      return `Tienes ${days} días de prueba gratuita`;
    }
  }
}
