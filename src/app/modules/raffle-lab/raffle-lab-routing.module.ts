import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PublicDemoComponent } from './pages/public-demo/public-demo.component';
import { ManagementDemoComponent } from './pages/management-demo/management-demo.component';

import { ManagementLoginComponent } from './pages/management-login/management-login.component';
import { RaffleManagementGuard } from './guards/raffle-management.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: PublicDemoComponent,
    data: {
      title: 'Raffle Lab - Public Demo'
    }
  },
  {
    path: 'management/login',
    component: ManagementLoginComponent,
    data: {
      title: 'Raffle Lab - Management Login'
    }
  },
  {
    path: 'management',
    pathMatch: 'full',
    component: ManagementDemoComponent,
    canActivate: [RaffleManagementGuard],
    data: {
      title: 'Raffle Lab - Management Demo'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RaffleLabRoutingModule { }