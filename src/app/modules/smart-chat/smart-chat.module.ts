import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SmartChatRoutingModule } from './smart-chat-routing.module';

// Components
import { WizardComponent } from './components/wizard/wizard.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ConversationsComponent } from './components/conversations/conversations.component';
import { SettingsComponent } from './components/settings/settings.component';

// Services
import { ChatService } from './services/chat.service';

@NgModule({
  declarations: [
    WizardComponent,
    DashboardComponent,
    ConversationsComponent,
    SettingsComponent
  ],
  imports: [
    CommonModule,
    SmartChatRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    ChatService
  ]
})
export class SmartChatModule { }
