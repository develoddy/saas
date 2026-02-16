import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { LayoutComponent } from './layout/layout.component';
import { SelectAppComponent } from './select-app/select-app.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './upgrade-success/upgrade-success.component';
import { GenericDashboardComponent } from './generic-dashboard/generic-dashboard.component';
import { AccountComponent } from './account/account.component';
import { TenantAuthGuard } from './core/tenant-auth.guard';
import { ModulePreviewWizardComponent } from './components/module-preview-wizard/module-preview-wizard.component';
import { VideoExpressWizardComponent } from './components/video-express-wizard/video-express-wizard.component';
import { SmartChatWizardComponent } from './components/smart-chat-wizard/smart-chat-wizard.component';
import { MvpsHubComponent } from './mvps-hub/mvps-hub.component';

const routes: Routes = [
  // 🏠 Ruta raíz pública - Hub de MVPs
  {
    path: '',
    component: MvpsHubComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'select-app',
    component: SelectAppComponent
  },
  {
    path: 'upgrade',
    component: UpgradeComponent
  },
  {
    path: 'upgrade/success',
    component: UpgradeSuccessComponent
  },
  // 🎯 Rutas públicas de Preview (SIN autenticación)
  // Video Express - Wizard específico con upload y generación de video
  // Usa arquitectura de módulos pero con UI personalizada
  {
    path: 'preview/video-express',
    component: VideoExpressWizardComponent,
    data: { 
      moduleKey: 'video-express',
      title: 'Video Express - Preview',
      description: 'Genera videos de producto con IA'
    }
  },
  // Smart Chat - Wizard MVP de validación WOW
  {
    path: 'preview/smart-chat',
    component: SmartChatWizardComponent,
    data: { 
      moduleKey: 'smart-chat',
      title: 'Smart Chat - Preview',
      description: 'Automatiza respuestas de atención al cliente'
    }
  },
  // Otros módulos - Wizard genérico basado en formularios
  {
    path: 'preview/:moduleKey',
    component: ModulePreviewWizardComponent
  },
  // 🔒 Rutas protegidas con autenticación
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [TenantAuthGuard],
    children: [
      {
        path: 'mailflow',
        loadChildren: () => import('./modules/mailflow/mailflow.module')
          .then(m => m.MailflowModule)
      },
      {
        path: 'smart-chat',
        loadChildren: () => import('./modules/smart-chat/smart-chat.module')
          .then(m => m.SmartChatModule)
      },
      {
        path: ':moduleKey',
        children: [
          {
            path: '',
            component: GenericDashboardComponent
          },
          {
            path: 'account',
            component: AccountComponent
          }
        ]
      }
   ,
  // 🔄 Redirect para compatibilidad con rutas antiguas
  {
    path: ':moduleKey',
    redirectTo: 'app/:moduleKey',
    pathMatch: 'full'
  } ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
