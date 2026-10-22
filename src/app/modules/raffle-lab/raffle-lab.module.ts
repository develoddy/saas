import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RaffleLabRoutingModule } from './raffle-lab-routing.module';
import { PublicDemoComponent } from './public/pages/home/public-demo.component';
import { WinnersComponent } from './public/pages/winners/winners.component';
import { RaffleHeaderComponent } from './public/components/header/header.component';
import { RaffleFooterComponent } from './public/components/footer/footer.component';
import { ManagementDemoComponent } from './admin/pages/dashboard/management-demo.component';
import { RaffleNumbersService } from './shared/services/raffle-numbers.service';

import { ManagementLoginComponent } from './admin/pages/login/management-login.component';


@NgModule({
  declarations: [
    PublicDemoComponent,
    WinnersComponent,
    RaffleHeaderComponent,
    RaffleFooterComponent,
    ManagementDemoComponent,
    ManagementLoginComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RaffleLabRoutingModule
  ],
  providers: [
    RaffleNumbersService
  ]
})
export class RaffleLabModule { }
