import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PreventionDemoComponent } from './components/prevention-demo/prevention-demo.component';
import { MODULE_KEYS } from '@config/module-keys';

/**
 * Landing Routing Module for Inbox Zero Prevention
 * 
 * Defines routes for the landing page (Phase 0):
 * - Public access (no guards)
 * - Validates demand and pain points
 * - Captures waitlist signups
 * 
 * @date 2026-02-24
 */

const routes: Routes = [
  {
    path: '',
    component: PreventionDemoComponent,
    data: {
      moduleKey: MODULE_KEYS.INBOX_ZERO.LANDING,
      title: 'Inbox Zero - Ticket Prevention System',
      description: 'Eliminate 60-80% of post-purchase support tickets before they exist'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule { }
