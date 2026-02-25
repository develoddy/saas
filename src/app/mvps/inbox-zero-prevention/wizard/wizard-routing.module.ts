import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InboxZeroWizardComponent } from './components/inbox-zero-wizard/inbox-zero-wizard.component';
import { ModuleActiveGuard } from '@guards/module-active.guard';
import { MODULE_KEYS } from '@config/module-keys';

/**
 * Wizard Routing Module for Inbox Zero Prevention
 * 
 * Defines routes for the wizard preview (Phase 1):
 * - Protected with ModuleActiveGuard
 * - Validates WOW moment and willingness to pay
 * - Supports ?internal=true for testing access
 * 
 * @date 2026-02-24
 */

const routes: Routes = [
  {
    path: '',
    component: InboxZeroWizardComponent,
    canActivate: [ModuleActiveGuard],
    data: {
      moduleKey: MODULE_KEYS.INBOX_ZERO.WIZARD,
      title: 'Inbox Zero - Wizard Preview',
      description: 'Interactive wizard to validate WOW moment and willingness to pay'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WizardRoutingModule { }
