import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TrackingService } from '../../services/tracking.service';

/**
 * Prevention Demo Component
 * 
 * Landing page de validación para Inbox Zero
 * 
 * Objetivo: Validar mensaje de "prevención de tickets" antes de construir SaaS
 * 
 * Contenido:
 * - Comparación visual: Sin Inbox Zero vs Con Inbox Zero
 * - Métricas reales del sistema en producción
 * - CTA: Join waitlist / Early access
 * 
 * @author LujanDev
 * @module components/prevention-demo
 */

interface RealMetric {
  label: string;
  before: string | number;
  after: string | number;
  improvement: string;
  icon: string;
}

@Component({
  selector: 'app-prevention-demo',
  templateUrl: './prevention-demo.component.html',
  styleUrls: ['./prevention-demo.component.scss']
})
export class PreventionDemoComponent implements OnInit {

  // Módulo identifier para tracking
  readonly moduleKey = 'inbox-zero-prevention';
  readonly moduleName = 'Inbox Zero';

  // 🎯 UTM Tracking para medir canales de distribución
  private utmSource: string = 'direct';
  private utmCampaign: string = '';
  private utmMedium: string = '';

  // Estado del formulario
  waitlistEmail = '';
  waitlistSubmitted = false;
  isSubmitting = false;
  errorMessage = '';

  // Métricas reales del sistema en producción
  readonly realMetrics: RealMetric[] = [
    {
      label: 'Tickets de soporte/mes',
      before: 40,
      after: 8,
      improvement: '-80%',
      icon: 'bi-chat-dots-fill'
    },
    {
      label: 'Tiempo respondiendo',
      before: '~3 horas/mes',
      after: '~35 min/mes',
      improvement: '-81%',
      icon: 'bi-clock-fill'
    },
    {
      label: 'Preguntas "¿Dónde está mi pedido?"',
      before: 32,
      after: 0,
      improvement: '-100%',
      icon: 'bi-envelope-fill'
    },
    {
      label: 'Satisfacción del cliente',
      before: 'Reactiva',
      after: 'Proactiva',
      improvement: '+40%',
      icon: 'bi-emoji-smile-fill'
    }
  ];

  // Casos de uso reales (preguntas que se eliminan)
  readonly eliminatedTickets = [
    '¿Dónde está mi pedido?',
    '¿Ha sido enviado?',
    '¿Cuándo llegará?',
    '¿Cuál es el número de seguimiento?',
    '¿Qué empresa lo envía?',
    '¿Está siendo procesado?',
    '¿Recibieron mi pago?',
    '¿Ha llegado mi pedido?'
  ];

  // Timeline de prevención (simplificado)
  readonly preventionFlow = [
    {
      day: 0,
      title: 'Cliente compra',
      action: 'Email automático: Confirmación + Link tracking',
      icon: '🛒',
      color: '#3b82f6'
    },
    {
      day: 1,
      title: 'Impresión iniciada',
      action: 'Email automático: "Tu diseño está en impresión"',
      icon: '🎨',
      color: '#8b5cf6'
    },
    {
      day: 3,
      title: 'Paquete enviado',
      action: 'Email automático: Tracking number + estimación',
      icon: '📦',
      color: '#10b981'
    },
    {
      day: 7,
      title: 'Entregado',
      action: 'Email automático: Confirmación + Request review',
      icon: '✅',
      color: '#059669'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trackingService: TrackingService
  ) {}

  ngOnInit(): void {
    // 🎯 PASO 1: Capturar UTMs ANTES de trackear eventos
    this.route.queryParams.subscribe(params => {
      if (params['utm_source']) {
        this.utmSource = params['utm_source'];
        this.utmCampaign = params['utm_campaign'] || '';
        this.utmMedium = params['utm_medium'] || '';
        
        // Guardar en sessionStorage para persistencia (opcional)
        sessionStorage.setItem('inbox_zero_prevention_utm_source', this.utmSource);
        if (this.utmCampaign) {
          sessionStorage.setItem('inbox_zero_prevention_utm_campaign', this.utmCampaign);
        }
        if (this.utmMedium) {
          sessionStorage.setItem('inbox_zero_prevention_utm_medium', this.utmMedium);
        }
      } else {
        // No hay UTMs en URL, intentar recuperar de sessionStorage
        const savedSource = sessionStorage.getItem('inbox_zero_prevention_utm_source');
        if (savedSource) {
          this.utmSource = savedSource;
          this.utmCampaign = sessionStorage.getItem('inbox_zero_prevention_utm_campaign') || '';
          this.utmMedium = sessionStorage.getItem('inbox_zero_prevention_utm_medium') || '';
        } else {
          // Sin UTMs, marcar como 'direct'
          this.utmSource = 'direct';
          this.utmCampaign = '';
          this.utmMedium = '';
          
          // Limpiar sessionStorage
          sessionStorage.removeItem('inbox_zero_prevention_utm_source');
          sessionStorage.removeItem('inbox_zero_prevention_utm_campaign');
          sessionStorage.removeItem('inbox_zero_prevention_utm_medium');
        }
      }
    });

    // 🎯 PASO 2: Track page view CON UTMs
    this.trackEvent('prevention_demo_viewed', {
      timestamp: Date.now()
    });
  }

  /**
   * Enviar solicitud de early access
   */
  async submitWaitlist(): Promise<void> {
    if (!this.waitlistEmail || !this.isValidEmail(this.waitlistEmail)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Track intención CON UTMs
      this.trackEvent('waitlist_submitted', {
        email: this.waitlistEmail,
        timestamp: Date.now()
      });

      // Simulación de envío (puedes conectar con backend real después)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Marcar como exitoso
      this.waitlistSubmitted = true;

      // Track éxito CON UTMs
      this.trackEvent('waitlist_success', {
        timestamp: Date.now()
      });

    } catch (error: any) {
      console.error('Error submitting waitlist:', error);
      this.errorMessage = 'Something went wrong. Please try again.';
      
      // Track error CON UTMs
      this.trackEvent('waitlist_error', {
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Validar email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Navegar a MVP Hub
   */
  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  /**
   * Track click en métrica CON UTMs
   */
  trackMetricClick(metric: string): void {
    this.trackEvent('metric_clicked', {
      metric: metric,
      timestamp: Date.now()
    });
  }

  /**
   * Track event helper - SIEMPRE envía UTMs con todos los eventos
   * Replica lógica del wizard viejo para consistencia de datos
   */
  private trackEvent(eventName: string, data: any = {}): void {
    this.trackingService.track(eventName, {
      ...data,
      module: this.moduleKey,
      moduleName: this.moduleName,
      source: this.utmSource,      // 🎯 utm_source (reddit, linkedin, etc.)
      campaign: this.utmCampaign,  // 🎯 utm_campaign (launch_feb2026, etc.)
      medium: this.utmMedium,      // 🎯 utm_medium (social, forum, etc.)
      timestamp: Date.now()
    });
  }
}
