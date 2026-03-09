import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatRoutingModule } from './chat-routing.module';

import { SharedModule } from 'src/app/shared/shared.module';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';

@NgModule({
  declarations: [
    ChatWidgetComponent
  ],
  imports: [
    CommonModule,
    ChatRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule
  ],
  exports: [ ChatWidgetComponent ]
})
export class ChatModule { }
