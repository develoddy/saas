import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RaffleLabRoutingModule } from './raffle-lab-routing.module';
import { PublicDemoComponent } from './pages/public-demo/public-demo.component';
import { ManagementDemoComponent } from './pages/management-demo/management-demo.component';
import { RaffleNumbersService } from './services/raffle-numbers.service';


@NgModule({
  declarations: [
    PublicDemoComponent,
    ManagementDemoComponent
  ],
  imports: [
    CommonModule,
    RaffleLabRoutingModule
  ],
  providers: [
    RaffleNumbersService
  ]
})
export class RaffleLabModule { }
