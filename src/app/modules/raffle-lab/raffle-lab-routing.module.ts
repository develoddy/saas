import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PublicDemoComponent } from './public/pages/home/public-demo.component';
import { WinnersComponent } from './public/pages/winners/winners.component';
import { LegalComponent } from './public/pages/legal/legal.component';
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
    path: 'legal',
    component: LegalComponent,
    data: { legalPage: 'legal' },
    title: 'NUMIQ | Aviso legal'
  },
  {
    path: 'privacy',
    component: LegalComponent,
    data: { legalPage: 'privacy' },
    title: 'NUMIQ | Privacidad'
  },
  {
    path: 'cookies',
    component: LegalComponent,
    data: { legalPage: 'cookies' },
    title: 'NUMIQ | Cookies y almacenamiento'
  },
  {
    path: 'terms',
    component: LegalComponent,
    data: { legalPage: 'terms' },
    title: 'NUMIQ | Condiciones de participación'
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