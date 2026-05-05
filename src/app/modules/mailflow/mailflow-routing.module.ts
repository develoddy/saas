import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OnboardingWizardComponent } from './onboarding/onboarding-wizard.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MailflowLandingComponent } from './landing/mailflow-landing.component';

const routes: Routes = [
  {
    path: '',
    component: MailflowLandingComponent // 🎯 Landing pública como página principal
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'onboarding',
    component: OnboardingWizardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MailflowRoutingModule { }
