import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EarlyAirportLandingComponent } from './landing/early-airport-landing.component';

const routes: Routes = [
  {
    path: '',
    component: EarlyAirportLandingComponent // 🎯 Landing pública como página principal
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EarlyAirportRoutingModule { }
