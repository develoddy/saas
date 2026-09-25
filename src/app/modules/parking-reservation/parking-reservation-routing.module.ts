import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ParkingReservationLandingComponent } from './landing/parking-reservation-landing.component';

const routes: Routes = [
  {
    path: '',
    component: ParkingReservationLandingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ParkingReservationRoutingModule { }