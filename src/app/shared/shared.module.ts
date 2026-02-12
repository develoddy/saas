import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { TrialBannerComponent } from './components/trial-banner/trial-banner.component';
import { ModulePreviewComponent } from './module-preview/module-preview.component';
import { ProUpgradeBlockComponent } from '../components/pro-upgrade-block/pro-upgrade-block.component';
import { ProModalComponent } from '../components/pro-modal/pro-modal.component';

@NgModule({
  declarations: [
    TrialBannerComponent,
    ModulePreviewComponent,
    ProUpgradeBlockComponent,
    ProModalComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    TrialBannerComponent,
    ModulePreviewComponent,
    ProUpgradeBlockComponent,
    ProModalComponent
  ]
})
export class SharedModule { }
