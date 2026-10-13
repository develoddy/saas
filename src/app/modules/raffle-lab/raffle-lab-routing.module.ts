import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PublicDemoComponent } from './pages/public-demo/public-demo.component';
import { ManagementDemoComponent } from './pages/management-demo/management-demo.component';

const routes: Routes = [
  {
    path: '',
    component: PublicDemoComponent,
    data: {
      title: 'Raffle Lab - Public Demo'
    }
  },
  {
    path: 'management',
    component: ManagementDemoComponent,
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