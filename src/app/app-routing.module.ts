import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { TenantAuthGuard } from './core/tenant-auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [TenantAuthGuard],
    children: [
      {
        path: 'newsletter-campaigns',
        loadChildren: () => import('./modules/newsletter-campaigns/newsletter-campaigns.module')
          .then(m => m.NewsletterCampaignsModule)
      },
      {
        path: '',
        redirectTo: 'newsletter-campaigns',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
