import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';

/**
 * 📧 MailFlow Landing Page
 * 
 * Premium SaaS landing page with modern design
 * Inspired by Stripe, Linear, Resend, Vercel
 * 
 * @module modules/mailflow/landing
 */
@Component({
  selector: 'app-mailflow-landing',
  templateUrl: './mailflow-landing.component.html',
  styleUrls: ['./mailflow-landing.component.scss']
})
export class MailflowLandingComponent {
  
  isScrolled = false;

  constructor(
    private router: Router
  ) {}

  /**
   * Detect scroll for navbar styling
   */
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 50;
  }

  /**
   * CTA: Join early access → Redirect to wizard
   */
  joinEarlyAccess(): void {
    this.router.navigate(['/mailflow/onboarding']);
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Scroll to section
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
