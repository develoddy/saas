import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TrialBannerComponent } from './components/trial-banner/trial-banner.component';

@NgModule({
  declarations: [
    TrialBannerComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    TrialBannerComponent
  ]
})
export class SharedModule { }
