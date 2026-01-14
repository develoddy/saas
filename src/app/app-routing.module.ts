import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { SelectAppComponent } from './select-app/select-app.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './upgrade-success/upgrade-success.component';
import { GenericDashboardComponent } from './generic-dashboard/generic-dashboard.component';
import { AccountComponent } from './account/account.component';
import { TenantAuthGuard } from './core/tenant-auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
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
  {
    path: '',
    component: LayoutComponent,
    canActivate: [TenantAuthGuard],
    children: [
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
