/**
 * 📦 Modelo de estado de tracking de pedidos
 * Combina datos de Printful API + Base de datos local
 * Soporte multi-tenant para Inbox Zero Prevention
 */

export interface OrderTrackingStatus {
  // Identificadores
  orderId: string;              // ID de Printful
  externalId: string;           // ID de Sale en BD
  
  // Estado del pedido
  status: PrintfulOrderStatus;
  progress: number;             // 0-100 para barra de progreso
  
  // 🏢 MULTI-TENANT: Información del tenant (nueva)
  tenant?: {
    id: number;
    name: string;
    slug: string;
    storeName: string;          // De tenant.settings.store_name
    logoUrl?: string;           // De tenant.settings.logo_url (futuro)
  } | null;
  
  // Items del pedido (desde Printful)
  items: OrderTrackingItem[];
  
  // Información de envío
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  
  // Fechas estimadas (desde BD local)
  estimated: {
    min: string | null;         // Fecha mínima estimada
    max: string | null;         // Fecha máxima estimada
  };
  
  // Fechas reales (desde Printful)
  dates: {
    created: string;            // Fecha de creación
    updated: string;            // Última actualización
    shipped: string | null;     // Fecha de envío
    delivered: string | null;   // Fecha de entrega
  };
  
  // Estados de Printful (raw data)
  printfulStatus: string;
  printfulRaw?: any;            // Data completa de Printful (opcional)
  
  // Timeline de eventos
  timeline: OrderTrackingEvent[];
}

/**
 * Estados posibles de Printful
 */
export type PrintfulOrderStatus = 
  | 'draft'           // Borrador
  | 'pending'         // Pendiente de pago
  | 'failed'          // Falló el pago o proceso
  | 'canceled'        // Cancelado
  | 'onhold'          // En espera
  | 'inprocess'       // En proceso de fabricación
  | 'partial'         // Parcialmente completado
  | 'fulfilled'       // Completado y enviado
  | 'archived';       // Archivado

/**
 * Item del pedido
 */
export interface OrderTrackingItem {
  id: number;
  external_id: string;
  variant_id: number;
  sync_variant_id: number;
  quantity: number;
  name: string;
  retail_price: string;
  files: OrderTrackingFile[];
  options: any[];
  sku: string | null;
  code_discount?: string;  // Para productos externos (SaaS) - nombre guardado aquí cuando productId es null
  product?: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
}

/**
 * Archivo asociado al item (imagen de producto)
 */
export interface OrderTrackingFile {
  id: number;
  type: string;
  hash: string | null;
  url: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  dpi: number | null;
  status: string;
  created: number;
  thumbnail_url: string | null;
  preview_url: string | null;
  visible: boolean;
}

/**
 * Evento en el timeline de tracking
 */
export interface OrderTrackingEvent {
  type: string;
  status: 'completed' | 'processing' | 'pending';
  title: string;
  description: string;
  date: string;
  completed: boolean;
}

/**
 * Respuesta del backend
 */
export interface OrderTrackingResponse {
  success: boolean;
  message: string;
  data: OrderTrackingStatus;
}

/**
 * Mapeo de progreso para cada estado (3 pasos: Order Placed → Shipped → Delivered)
 */
export const ORDER_TRACKING_PROGRESS_MAP: Record<string, number> = {
  'draft': 0,
  'pending': 15,
  'failed': 0,
  'canceled': 0,
  'onhold': 15,
  'inprocess': 33,     // Processing/Manufacturing (antes de envío)
  'partial': 66,       // Enviado parcialmente
  'fulfilled': 100,    // Completado
  'archived': 100
};
