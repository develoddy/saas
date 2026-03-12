import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderStatusComponent } from './pages/order-status/order-status.component';

/**
 * Order Tracking Routing Module
 * 
 * Ruta pública para consultar estado de pedidos con token de seguridad
 * URL: /tracking/:orderId/:token
 * 
 * @date 2026-03-12
 */
const routes: Routes = [
  {
    path: ':orderId/:token',
    component: OrderStatusComponent,
    data: {
      title: 'Track Your Order'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrderTrackingRoutingModule { }
