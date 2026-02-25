import { NgModule } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { WizardRoutingModule } from './wizard-routing.module';
import { InboxZeroWizardComponent } from './components/inbox-zero-wizard/inbox-zero-wizard.component';

/**
 * Wizard Module for Inbox Zero Prevention (Phase 1)
 * 
 * Provides the interactive wizard/preview experience:
 * - Validates WOW moment (users see value immediately)
 * - Validates willingness to pay (users want to unlock full feature)
 * - Gated by ModuleActiveGuard (requires landing interaction)
 * - Supports ?internal=true for team testing
 * 
 * This is a lazy-loaded child module of InboxZeroPreventionModule.
 * 
 * @date 2026-02-24
 */

@NgModule({
  declarations: [
    InboxZeroWizardComponent
  ],
  imports: [
    SharedModule,
    WizardRoutingModule
  ]
})
export class WizardModule { }
