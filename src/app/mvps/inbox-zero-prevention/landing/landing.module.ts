import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { LandingRoutingModule } from './landing-routing.module';
import { PreventionDemoComponent } from './components/prevention-demo/prevention-demo.component';

/**
 * Landing Module for Inbox Zero Prevention
 * 
 * Phase 0: Landing Page - Validates demand and pain points
 * 
 * Features:
 * - Visual comparison (before/after)
 * - Real metrics showcase
 * - Waitlist signup form
 * - Pain point tracking
 * 
 * This module is lazy loaded from the main MVP module.
 * 
 * @date 2026-02-24
 */
@NgModule({
  declarations: [
    PreventionDemoComponent
  ],
  imports: [
    SharedModule,           // Provides CommonModule, FormsModule, shared components
    LandingRoutingModule    // Routes for landing phase
  ]
})
export class LandingModule { }
