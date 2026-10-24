import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PublicDemoComponent } from './public/pages/home/public-demo.component';
import { WinnersComponent } from './public/pages/winners/winners.component';
import { ManagementDemoComponent } from './admin/pages/dashboard/management-demo.component';

import { ManagementLoginComponent } from './admin/pages/login/management-login.component';
import { RaffleManagementGuard } from './guards/raffle-management.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: PublicDemoComponent,
    title: 'NUMIQ | Sorteos'
  },
  {
    path: 'winners',
    pathMatch: 'full',
    component: WinnersComponent,
    title: 'NUMIQ | Ganadores'
  },
  {
    path: 'management/login',
    component: ManagementLoginComponent,
    title: 'NUMIQ | Acceso a gestión'
  },
  {
    path: 'management',
    pathMatch: 'full',
    component: ManagementDemoComponent,
    canActivate: [RaffleManagementGuard],
    title: 'NUMIQ | Panel de gestión'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RaffleLabRoutingModule { }