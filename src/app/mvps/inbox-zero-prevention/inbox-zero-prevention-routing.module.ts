import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * Inbox Zero Prevention Routing Module (Principal Module)
 * 
 * Implements double lazy loading architecture:
 * - Level 1: This module is lazy loaded from app-routing.module.ts
 * - Level 2: Each phase (landing, wizard, live) is lazy loaded on demand
 * 
 * Route Strategy:
 * - /inbox-zero-prevention/landing → Prevention Demo (Phase 0)
 * - /inbox-zero-prevention/wizard → Wizard Preview (Phase 1, gated)
 * - /inbox-zero-prevention → Live Feature (Phase 2, future)
 * 
 * @date 2026-02-24
 */

const routes: Routes = [
  // 🔄 Root path loads landing directly (preserves production URLs)
  {
    path: '',
    loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule),
    data: {
      title: 'Inbox Zero Prevention - Validate Your Pain Point'
    }
  },
  // 🎯 Explicit /landing path redirects to root (for consistency)
  {
    path: 'landing',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'wizard',
    loadChildren: () => import('./wizard/wizard.module').then(m => m.WizardModule),
    data: {
      title: 'Inbox Zero Prevention - Wizard'
    }
  }
  // Future: Live feature route when validated
  // {
  //   path: 'live',
  //   loadChildren: () => import('./live/live.module').then(m => m.LiveModule),
  //   data: {
  //     title: 'Inbox Zero Prevention - Live Product'
  //   }
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InboxZeroPreventionRoutingModule { }
