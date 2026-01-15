import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MailflowRoutingModule } from './mailflow-routing.module';
import { OnboardingWizardComponent } from './onboarding/onboarding-wizard.component';
import { SequenceEmailCardComponent } from './shared/sequence-email-card.component';
import { MailflowService } from './services/mailflow.service';

@NgModule({
  declarations: [
    OnboardingWizardComponent,
    SequenceEmailCardComponent
  ],
  imports: [
    CommonModule,
    MailflowRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    MailflowService
  ]
})
export class MailflowModule { }
