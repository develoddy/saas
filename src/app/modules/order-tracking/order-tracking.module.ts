import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { OrderTrackingRoutingModule } from './order-tracking-routing.module';
import { OrderStatusComponent } from './pages/order-status/order-status.component';
import { OrderTrackingService } from './services/order-tracking.service';

/**
 * Order Tracking Module
 * 
 * Módulo standalone para tracking de pedidos con soporte multi-tenant.
 * Diseñado para ser usado desde cualquier MVP sin dependencias del ecommerce.
 * 
 * Características:
 * - Consulta estado de pedidos con token de seguridad
 * - Integración con Printful API para datos en tiempo real
 * - Soporte multi-tenant (muestra branding del tenant si existe)
 * - Diseño limpio sin header/footer del ecommerce
 * 
 * Ruta: /tracking/:orderId/:token
 * 
 * @date 2026-03-12
 */
@NgModule({
  declarations: [
    OrderStatusComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    OrderTrackingRoutingModule
  ],
  providers: [
    OrderTrackingService
  ]
})
export class OrderTrackingModule { }
