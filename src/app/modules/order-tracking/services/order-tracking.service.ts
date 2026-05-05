import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { finalize, timeout, retry, catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { OrderTrackingResponse, OrderTrackingStatus, ORDER_TRACKING_PROGRESS_MAP } from '../models/order-tracking.model';

/**
 * 📦 Servicio de Tracking de Pedidos
 * 
 * Servicio standalone para consultar el estado de pedidos con token de seguridad.
 * Diseñado para ser usado desde cualquier MVP (Inbox Zero Prevention, etc.)
 * 
 * Características:
 * - Llamadas directas a API backend que consulta Printful
 * - Combina datos de Printful + BD local
 * - Soporte multi-tenant (muestra info del tenant si existe)
 * - Manejo robusto de errores
 * - Timeouts y retries automáticos
 * 
 * @date 2026-03-12
 */
@Injectable({
  providedIn: 'root'
})
export class OrderTrackingService {

  isLoading$: Observable<boolean>;
  isLoadingSubject: BehaviorSubject<boolean>;

  // Configuración de timeouts y retries
  private readonly DEFAULT_TIMEOUT = 30000; // 30 segundos
  private readonly MAX_RETRIES = 2; // Reintentar 2 veces

  constructor(private http: HttpClient) {
    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  /**
   * 🔍 Obtener estado de tracking por Order ID + Token
   * 
   * Endpoint: GET /api/orders/tracking/:orderId/:token
   * 
   * @param orderId - ID de la orden (Sale.id o printfulOrderId)
   * @param token - Token de seguridad (trackingToken)
   * @returns Observable con el estado completo del tracking
   */
  getTrackingStatus(orderId: string, token: string): Observable<OrderTrackingStatus> {
    this.isLoadingSubject.next(true);
    
    const url = `${environment.URL_SERVICE}orders/tracking/${orderId}/${token}`;

    return this.http.get<OrderTrackingResponse>(url).pipe(
      timeout(this.DEFAULT_TIMEOUT),
      retry(this.MAX_RETRIES),
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'No se pudo obtener el estado del pedido');
        }
    
        return response.data;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo tracking:', error);
        
        // Manejar diferentes tipos de errores
        if (error.name === 'TimeoutError') {
          return throwError(() => ({
            message: 'La consulta tardó demasiado tiempo. Por favor, intenta de nuevo.',
            error: error
          }));
        }
        
        if (error.status === 0) {
          return throwError(() => ({
            message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
            error: error
          }));
        }
        
        if (error.status === 404) {
          return throwError(() => ({
            message: 'Orden no encontrada. Verifica el número de orden y el token.',
            error: error
          }));
        }
        
        if (error.status === 400) {
          return throwError(() => ({
            message: 'Número de orden o token inválido.',
            error: error
          }));
        }
        
        // Error genérico
        return throwError(() => ({
          message: error.error?.message || 'Error al consultar el tracking',
          error: error
        }));
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
      })
    );
  }

  /**
   * 📊 Calcular progreso visual basado en estado de Printful
   * 
   * @param status - Estado de Printful
   * @returns Porcentaje de progreso (0-100)
   */
  calculateProgress(status: string): number {
    return ORDER_TRACKING_PROGRESS_MAP[status?.toLowerCase()] || 0;
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado
   * 
   * @param status - Estado de Printful
   * @returns Clase CSS de Bootstrap
   */
  getStatusBadgeClass(status: string): string {
    const statusLower = status?.toLowerCase();
    
    switch (statusLower) {
      case 'fulfilled':
        return 'bg-success';
      case 'inprocess':
      case 'partial':
        return 'bg-primary';
      case 'pending':
      case 'onhold':
        return 'bg-warning text-dark';
      case 'failed':
      case 'canceled':
        return 'bg-danger';
      case 'draft':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * 📝 Obtener texto en inglés para estado
   * 
   * @param status - Estado de Printful
   * @returns Texto traducido
   */
  getStatusText(status: string): string {
    const statusLower = status?.toLowerCase();
    
    const translations: Record<string, string> = {
      'draft': 'Borrador',
      'pending': 'Pendiente',
      'failed': 'Fallido',
      'canceled': 'Cancelado',
      'onhold': 'En Espera',
      'inprocess': 'En Proceso',
      'partial': 'Parcialmente Completado',
      'fulfilled': 'Completado',
      'archived': 'Archivado'
    };
    
    return translations[statusLower] || status;
  }

  /**
   * 🔄 Validar formato de Order ID
   * 
   * @param orderId - ID a validar
   * @returns true si el formato es válido
   */
  validateOrderId(orderId: string): boolean {
    if (!orderId || orderId.trim() === '') {
      return false;
    }

    // Permitir números (Printful ID) o alfanuméricos (external_id)
    const orderIdPattern = /^[a-zA-Z0-9\-_]+$/;
    return orderIdPattern.test(orderId.trim());
  }

  /**
   * 🧹 Limpiar Order ID (remover #PF prefijo si existe)
   * 
   * @param orderId - ID a limpiar
   * @returns Order ID limpio
   */
  sanitizeOrderId(orderId: string): string {
    return orderId.trim().replace(/^#?PF/i, '').trim();
  }
}
