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
import { ModulePreviewWizardComponent } from './components/module-preview-wizard/module-preview-wizard.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'select-app',
    component: SelectAppComponent
  },
  {
    path: 'upgrade',
    component: UpgradeComponent
  },
  {
    path: 'upgrade/success',
    component: UpgradeSuccessComponent
  },
  // 🎯 Rutas públicas de Preview (SIN autenticación)
  {
    path: 'preview/:moduleKey',
    component: ModulePreviewWizardComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [TenantAuthGuard],
    children: [
      {
        path: 'mailflow',
        loadChildren: () => import('./modules/mailflow/mailflow.module')
          .then(m => m.MailflowModule)
      },
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
