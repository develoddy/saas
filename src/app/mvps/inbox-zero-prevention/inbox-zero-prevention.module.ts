import { NgModule } from '@angular/core';
import { InboxZeroPreventionRoutingModule } from './inbox-zero-prevention-routing.module';

/**
 * Inbox Zero Prevention Module (Principal MVP Module)
 * 
 * This is the root module for the Inbox Zero Prevention MVP.
 * It orchestrates all phases using double lazy loading:
 * 
 * Architecture:
 * 1. This module is lazy loaded from app-routing.module.ts
 * 2. Each phase (landing, wizard, live) is lazy loaded via child routes
 * 
 * Phases:
 * - Phase 0 (landing): Prevention Demo - Show system preventing tickets
 * - Phase 1 (wizard): Wizard Preview - Interactive WOW + willingness to pay validation
 * - Phase 2 (live): Full Feature - Complete Inbox Zero system (future)
 * 
 * Service Scope:
 * - Shared services are provided in SharedModule (singleton across app)
 * - MVP-specific services can be provided here (scoped to this MVP)
 * 
 * @date 2026-02-24
 */

@NgModule({
  imports: [
    InboxZeroPreventionRoutingModule
  ],
  providers: [
    // Future: Add MVP-specific services here
    // e.g., InboxZeroAnalyticsService (scoped to this MVP only)
  ]
})
export class InboxZeroPreventionModule { }
