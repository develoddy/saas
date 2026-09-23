import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { EarlyAirportRoutingModule } from './early-airport-routing.module';
import { EarlyAirportLandingComponent } from './landing/early-airport-landing.component';

@NgModule({
  declarations: [
    EarlyAirportLandingComponent
  ],
  imports: [
    CommonModule,
    EarlyAirportRoutingModule,
    ReactiveFormsModule
  ]
})
export class EarlyAirportModule { }
