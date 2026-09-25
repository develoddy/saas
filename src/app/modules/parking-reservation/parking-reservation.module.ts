import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ParkingReservationRoutingModule } from './parking-reservation-routing.module';
import { ParkingReservationLandingComponent } from './landing/parking-reservation-landing.component';

@NgModule({
  declarations: [
    ParkingReservationLandingComponent
  ],
  imports: [
    CommonModule,
    ParkingReservationRoutingModule,
    ReactiveFormsModule
  ]
})
export class ParkingReservationModule { }