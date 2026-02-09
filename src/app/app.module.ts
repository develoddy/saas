import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { LayoutComponent } from './layout/layout.component';
import { SelectAppComponent } from './select-app/select-app.component';
import { UpgradeComponent } from './upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './upgrade-success/upgrade-success.component';
import { GenericDashboardComponent } from './generic-dashboard/generic-dashboard.component';
import { AccountComponent } from './account/account.component';
import { ModulePreviewWizardComponent } from './components/module-preview-wizard/module-preview-wizard.component';
import { VideoExpressWizardComponent } from './components/video-express-wizard/video-express-wizard.component';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    LayoutComponent,
    SelectAppComponent,
    UpgradeComponent,
    UpgradeSuccessComponent,
    GenericDashboardComponent,
    AccountComponent,
    ModulePreviewWizardComponent,
    VideoExpressWizardComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Requerido para animaciones (ya usado en 
    // VideoExpressWizard)
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    SharedModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
