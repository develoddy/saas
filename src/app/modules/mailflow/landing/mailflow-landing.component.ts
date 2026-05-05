import { Component } from '@angular/core';
import { Router } from '@angular/router';

/**
 * 📧 MailFlow Landing Page
 * 
 * Landing pública estilo marketing directo para MailFlow
 * Objetivo: Captar early adopters y validación de mercado
 * 
 * @module modules/mailflow/landing
 * @inspiration inbox-zero / inbox-prevention landings
 */
@Component({
  selector: 'app-mailflow-landing',
  templateUrl: './mailflow-landing.component.html',
  styleUrls: ['./mailflow-landing.component.scss']
})
export class MailflowLandingComponent {
  
  constructor(
    private router: Router
  ) {}

  /**
   * CTA: Join early access → Redirect al wizard
   */
  joinEarlyAccess(): void {
    this.router.navigate(['/mailflow/onboarding']);
  }

  /**
   * Scroll suave a sección específica
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
