import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Pro Upgrade Block Component
 * 
 * Componente reutilizable para validar intención de monetización
 * en cualquier módulo del MVP (Mailflow, Video Express, etc.)
 * 
 * Experimento Lean: Medir willingness to pay sin implementar Stripe
 * 
 * @module components/pro-upgrade-block
 */

export interface ProFeature {
  icon: string;
  label: string;
  description?: string;
}

export interface MonetizationContext {
  module: string;
  source: string;
  feature: string;
  [key: string]: any; // Datos adicionales del preview
}

@Component({
  selector: 'app-pro-upgrade-block',
  templateUrl: './pro-upgrade-block.component.html',
  styleUrls: ['./pro-upgrade-block.component.scss']
})
export class ProUpgradeBlockComponent {
  
  /**
   * Módulo origen (mailflow, video-express, etc.)
   */
  @Input() module = '';
  
  /**
   * Features del plan Pro a mostrar
   */
  @Input() features: ProFeature[] = [];
  
  /**
   * Datos de contexto para tracking (preview_type, industry, etc.)
   */
  @Input() contextData: MonetizationContext | null = null;
  
  /**
   * Texto del CTA (personalizable)
   */
  @Input() ctaText = 'Upgrade to Pro';
  
  /**
   * Variante visual (default, minimal, premium)
   */
  @Input() variant: 'default' | 'minimal' | 'premium' = 'default';
  
  /**
   * Evento cuando usuario hace clic en upgrade
   * Emite los datos de contexto para tracking
   */
  @Output() onUpgradeClick = new EventEmitter<MonetizationContext>();
  
  /**
   * Handle click en botón Upgrade
   */
  handleUpgradeClick(): void {
    const eventData: MonetizationContext = {
      module: this.module,
      source: this.contextData?.source || 'preview',
      feature: 'pro_upgrade',
      ...this.contextData
    };
    
    this.onUpgradeClick.emit(eventData);
  }
}
