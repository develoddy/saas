import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { TrialBannerComponent } from './components/trial-banner/trial-banner.component';
import { ModulePreviewComponent } from './module-preview/module-preview.component';

@NgModule({
  declarations: [
    TrialBannerComponent,
    ModulePreviewComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    TrialBannerComponent,
    ModulePreviewComponent
  ]
})
export class SharedModule { }
