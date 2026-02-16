import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WizardComponent } from './components/wizard/wizard.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ConversationsComponent } from './components/conversations/conversations.component';
import { SettingsComponent } from './components/settings/settings.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'wizard',
    pathMatch: 'full'
  },
  {
    path: 'wizard',
    component: WizardComponent,
    data: { title: 'Configuración Inicial' }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { title: 'Dashboard' }
  },
  {
    path: 'conversations',
    component: ConversationsComponent,
    data: { title: 'Conversaciones' }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    data: { title: 'Configuración' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SmartChatRoutingModule { }
