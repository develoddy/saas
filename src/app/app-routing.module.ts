import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { LayoutComponent } from './layout/layout.component';
import { SelectAppComponent } from './select-app/select-app.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './upgrade-success/upgrade-success.component';
import { GenericDashboardComponent } from './generic-dashboard/generic-dashboard.component';
import { AccountComponent } from './account/account.component';
import { TenantAuthGuard } from './core/tenant-auth.guard';
import { ModuleActiveGuard } from './guards/module-active.guard';
import { ModulePreviewWizardComponent } from './components/module-preview-wizard/module-preview-wizard.component';
import { VideoExpressWizardComponent } from './components/video-express-wizard/video-express-wizard.component';
import { MvpsHubComponent } from './mvps-hub/mvps-hub.component';

/**
 * App Routing Module
 * 
 * Arquitectura de rutas con Double Lazy Loading:
 * 
 * NIVEL 1: Lazy loading del módulo principal MVP
 *    - Ruta: /nombre-mvp
 *    - Carga: InboxZeroPreventionModule, ProductClipModule, etc.
 * 
 * NIVEL 2: Lazy loading de fases dentro de cada MVP
 *    - Landing (Fase 0): /nombre-mvp/landing
 *    - Wizard (Fase 1): /nombre-mvp/wizard
 *    - Live (Fase 2): /nombre-mvp (ruta por defecto)
 * 
 * BENEFICIOS:
 *    - Carga bajo demanda (mejor performance)
 *    - Aislamiento de código (MVPs independientes)
 *    - Escalabilidad (agregar MVPs sin modificar app.module)
 * 
 * EJEMPLO: Inbox Zero Prevention
 *    /inbox-zero-prevention → lazy loads InboxZeroPreventionModule
 *    /inbox-zero-prevention/landing → lazy loads LandingModule
 *    /inbox-zero-prevention/wizard → lazy loads WizardModule (gated con ModuleActiveGuard)
 * 
 * @date 2026-02-24
 */
const routes: Routes = [
  // ============================================
  // 🏠 MVPs HUB (Entry Point)
  // ============================================
  {
    path: '',
    component: MvpsHubComponent,
    data: { 
      title: 'MVPs Hub - Micro SaaS Validation Platform'
    }
  },

  // ============================================
  // 📦 MVP MODULES (Double Lazy Loading)
  // Each MVP is lazy loaded, then phases are lazy loaded within MVP
  // ============================================
  
  // Inbox Zero Prevention MVP
  {
    path: 'inbox-zero-prevention',
    loadChildren: () => import('./mvps/inbox-zero-prevention/inbox-zero-prevention.module')
      .then(m => m.InboxZeroPreventionModule),
    data: { 
      title: 'Inbox Zero Prevention'
    }
  },
  {
    path: 'preview/productclip',
    component: VideoExpressWizardComponent,
    canActivate: [ModuleActiveGuard],
    data: { 
      moduleKey: 'productclip',
      title: 'ProductClip - Preview',
      description: 'Transform product photos into scroll-stopping video clips'
    }
  },
  {
    path: 'preview/:moduleKey',
    component: ModulePreviewWizardComponent,
    canActivate: [ModuleActiveGuard],
    data: {
      title: 'Module Preview'
    }
  },

  // ============================================
  // 🔐 AUTENTICACIÓN
  // ============================================
  {
    path: 'login',
    component: LoginComponent,
    data: { title: 'Login' }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: { title: 'Register' }
  },
  {
    path: 'select-app',
    component: SelectAppComponent,
    data: { title: 'Select App' }
  },
  {
    path: 'upgrade',
    component: UpgradeComponent,
    data: { title: 'Upgrade Plan' }
  },
  {
    path: 'upgrade/success',
    component: UpgradeSuccessComponent,
    data: { title: 'Upgrade Successful' }
  },

  // ============================================
  // 🔒 LIVE PRODUCTS (Fase 2)
  // Protegidas con TenantAuthGuard - Producto completo
  // ============================================
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [TenantAuthGuard],
    children: [
      // Legacy modules con lazy loading (migrar a sistema de módulos progresivamente)
      {
        path: 'mailflow',
        loadChildren: () => import('./modules/mailflow/mailflow.module')
          .then(m => m.MailflowModule)
      },
      {
        path: 'smart-chat',
        loadChildren: () => import('./modules/smart-chat/smart-chat.module')
          .then(m => m.SmartChatModule)
      },
      // Dashboard genérico para módulos dinámicos (fase 2 - live)
      {
        path: ':moduleKey',
        children: [
          {
            path: '',
            component: GenericDashboardComponent
          },
          {
            path: 'account',
            component: AccountComponent
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
