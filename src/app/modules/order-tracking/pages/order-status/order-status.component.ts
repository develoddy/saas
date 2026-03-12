import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { OrderTrackingService } from '../../services/order-tracking.service';
import { OrderTrackingStatus, OrderTrackingEvent } from '../../models/order-tracking.model';

/**
 * 📦 Componente de visualización de estado de tracking de pedidos
 * 
 * Página pública standalone que muestra el estado completo del pedido
 * Sin dependencias del ecommerce (no usa app-header ni app-footer)
 * 
 * Características:
 * - Diseño limpio estilo Amazon con barra de progreso y timeline
 * - Soporte multi-tenant: muestra nombre del tenant si existe
 * - Consulta Printful API en tiempo real para estado actualizado
 * - Seguridad: requiere token único para acceder
 * 
 * Ruta: /tracking/:orderId/:token
 * 
 * @date 2026-03-12
 */
@Component({
  selector: 'app-order-status',
  templateUrl: './order-status.component.html',
  styleUrls: ['./order-status.component.scss']
})
export class OrderStatusComponent implements OnInit, OnDestroy {

  // Data del pedido
  orderId: string = '';
  token: string = '';
  trackingData: OrderTrackingStatus | null = null;
  
  // Estados de UI
  isLoading: boolean = false;
  error: string = '';
  
  // Timeline de eventos (estilo Amazon)
  timeline: OrderTrackingEvent[] = [];
  
  // 🏢 Multi-tenant
  storeName: string = 'LujanDev'; // Default si no hay tenant
  showTenantBranding: boolean = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: OrderTrackingService
  ) { }

  ngOnInit(): void {
    // Obtener Order ID y Token de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['orderId'];
        this.token = params['token'];
        
        if (this.orderId && this.token) {
          this.loadTrackingData();
        } else {
          this.error = 'Número de orden o token faltante';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🔄 Cargar datos de tracking desde el backend
   */
  loadTrackingData(): void {
    this.isLoading = true;
    this.error = '';

    this.trackingService.getTrackingStatus(this.orderId, this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trackingData = data;
          this.timeline = data.timeline || this.generateTimeline(data);
          
          // 🏢 Multi-tenant: Configurar branding
          if (data.tenant && data.tenant.storeName) {
            this.storeName = data.tenant.storeName;
            this.showTenantBranding = true;
          } else {
            this.storeName = 'LujanDev';
            this.showTenantBranding = false;
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.message || 'Error al cargar el estado del pedido';
          this.isLoading = false;
          console.error('❌ Error loading tracking:', error);
        }
      });
  }

  /**
   * 🔄 Refrescar datos de tracking
   */
  refreshTracking(): void {
    this.loadTrackingData();
  }

  /**
   * 📝 Generar timeline de eventos basado en estado de Printful
   */
  private generateTimeline(data: OrderTrackingStatus): OrderTrackingEvent[] {
    const events: OrderTrackingEvent[] = [
      {
        type: 'order_received',
        status: 'completed',
        title: 'Pedido Recibido',
        description: 'Tu pedido ha sido recibido y confirmado',
        date: data.dates.created,
        completed: true
      },
      {
        type: 'processing',
        status: this.getEventStatus(data.status, 'processing'),
        title: 'Procesando',
        description: 'Validando pago y preparando orden',
        date: data.dates.created,
        completed: ['inprocess', 'partial', 'fulfilled'].includes(data.status)
      },
      {
        type: 'manufacturing',
        status: this.getEventStatus(data.status, 'manufacturing'),
        title: 'Fabricando',
        description: 'Tu producto está siendo fabricado',
        date: data.dates.updated,
        completed: ['partial', 'fulfilled'].includes(data.status)
      },
      {
        type: 'shipped',
        status: this.getEventStatus(data.status, 'shipped'),
        title: 'Enviado',
        description: data.trackingNumber 
          ? `En tránsito - ${data.carrier || 'Carrier'}: ${data.trackingNumber}`
          : 'Tu pedido está en camino',
        date: data.dates.shipped || '',
        completed: data.status === 'fulfilled' || !!data.trackingNumber
      },
      {
        type: 'delivered',
        status: this.getEventStatus(data.status, 'delivered'),
        title: 'Entregado',
        description: data.dates.delivered 
          ? 'Tu pedido ha sido entregado'
          : 'Esperando entrega',
        date: data.dates.delivered || data.estimated.max || '',
        completed: data.status === 'fulfilled' && !!data.dates.delivered
      }
    ];

    return events;
  }

  /**
   * 🎯 Determinar estado de un evento en el timeline
   */
  private getEventStatus(orderStatus: string, eventType: string): 'completed' | 'processing' | 'pending' {
    const statusFlow = ['pending', 'onhold', 'inprocess', 'partial', 'fulfilled'];
    const eventFlow = ['order_received', 'processing', 'manufacturing', 'shipped', 'delivered'];
    
    const orderIndex = statusFlow.indexOf(orderStatus);
    const eventIndex = eventFlow.indexOf(eventType);
    
    if (orderIndex < 0 || eventIndex < 0) return 'pending';
    if (orderIndex > eventIndex) return 'completed';
    if (orderIndex === eventIndex) return 'processing';
    return 'pending';
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado
   */
  getStatusBadgeClass(): string {
    if (!this.trackingData) return 'bg-secondary';
    return this.trackingService.getStatusBadgeClass(this.trackingData.status);
  }

  /**
   * 📝 Obtener texto en español para estado
   */
  getStatusText(): string {
    if (!this.trackingData) return '';
    return this.trackingService.getStatusText(this.trackingData.status);
  }

  /**
   * 📊 Obtener porcentaje de progreso
   */
  getProgressPercentage(): number {
    if (!this.trackingData) return 0;
    return this.trackingService.calculateProgress(this.trackingData.status);
  }

  /**
   * 🎨 Obtener clase CSS para step del timeline
   */
  getTimelineStepClass(event: OrderTrackingEvent): string {
    if (event.completed) return 'timeline-step-completed';
    if (event.status === 'processing') return 'timeline-step-processing';
    return 'timeline-step-pending';
  }

  /**
   * 🔗 Abrir tracking URL del carrier en nueva pestaña
   */
  openTrackingUrl(): void {
    if (this.trackingData?.trackingUrl) {
      window.open(this.trackingData.trackingUrl, '_blank');
    }
  }

  /**
   * 📅 Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * 📅 Formatear fecha corta
   */
  formatDateShort(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * 🖼️ Generar SVG placeholder inline para productos sin imagen
   * Evita 404s en bucle al intentar cargar archivo externo inexistente
   */
  getPlaceholderSvg(): string {
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTRhM2I4Ij7wn4S6PC90ZXh0Pjwvc3ZnPg==`;
  }
}
