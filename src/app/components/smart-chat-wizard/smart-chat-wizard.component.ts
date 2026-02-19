import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TrackingService } from '../../services/tracking.service';
import { ModulePreviewService } from '../../services/module-preview.service';

/**
 * Inbox Zero Wizard Component (formerly Smart Chat)
 * 
 * Wizard MVP de 3 pasos para validar interés en automatización de soporte
 * sin autenticación ni configuración técnica.
 * 
 * Tagline: "Turn repetitive customer questions into zero-second responses"
 * 
 * Flow (WOW-oriented):
 * 1. Mostrar problema real del comerciante (mensajes repetitivos)
 * 2. Simulación WOW + Preview interactivo (fusionados para mantener momentum)
 * 3. CTA + Pricing blocker (señal de WTP)
 * 
 * Ruta: /preview/smart-chat (legacy)
 * Ruta: /preview/inbox-zero (nuevo)
 * 
 * Objetivo: Validar VALOR PERCIBIDO + WILLINGNESS TO PAY
 * Medición: tracking_events en /lab/analytics
 * 
 * @author LujanDev
 * @module components/smart-chat-wizard
 */

interface SimulatedMessage {
  id: number;
  sender: 'user' | 'bot';
  message: string;
  timestamp: Date;
  delay?: number; // ms antes de mostrar
  suggestedQuestions?: string[]; // Quick-reply buttons for guidance
}

interface WizardState {
  currentStep: 1 | 2 | 3; // 🎯 Reducido de 4 a 3 pasos (fusionamos 2+3)
  
  // Paso 1: Problema
  problemUnderstanding: boolean;
  
  // Paso 2: Simulación WOW
  simulationStarted: boolean;
  simulationMessages: SimulatedMessage[];
  currentSimulationIndex: number;
  simulationCompleted: boolean;
  
  // Paso 2: Simulación + Preview Interactivo (fusionados)
  userQuestion: string;
  interactiveMessages: SimulatedMessage[];
  hasTriedInteractive: boolean;
  isInteractiveMode: boolean; // True cuando termina simulación y pasa a modo interactivo
  showInteractivePrompt: boolean; // Modal CTA después de simulación completada
  
  // Paso 3: CTA + Pricing (WTP signal)
  showEmbedCode: boolean;
  embedCodeCopied: boolean;
  showPricingModal: boolean; // Modal de pricing (€49/mes)
  showEmailCapture: boolean; // Modal para early access
  userEmail: string; // Email capturado
  emailSubmitted: boolean;
  
  // Feedback & Tracking (MVP Validation)
  feedbackAnswer: 'yes' | 'partial' | 'no' | null;
  feedbackSubmitted: boolean;
  feedbackComment: string;
  feedbackMessage: string | null;
  
  // Tracking flags
  simulationViewed: boolean;
  interactiveUsed: boolean;
  
  // Loading states premium (WOW perception)
  loading: boolean;
  loadingStage: 'thinking' | 'analyzing' | 'generating' | null;
  
  // General
  error: string | null;
}

@Component({
  selector: 'app-smart-chat-wizard',
  templateUrl: './smart-chat-wizard.component.html',
  styleUrls: ['./smart-chat-wizard.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('messageSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class SmartChatWizardComponent implements OnInit, OnDestroy {
  
  // Integración con sistema de módulos
  readonly moduleKey = 'inbox-zero'; // 🎯 Nuevo identificador de producto
  readonly moduleName = 'Inbox Zero'; // 🎯 Nuevo nombre de producto
  readonly moduleTagline = 'Turn repetitive customer questions into zero-second responses';
  
  private destroy$ = new Subject<void>();
  private simulationInterval: any;
  
  // Module Status Control
  public isInternalAccess: boolean = false; // true si acceso con ?internal=true
  public isBlocked: boolean = false; // true si módulo bloqueado (status=testing sin ?internal)
  
  // Preguntas frecuentes reales de e-commerce
  readonly frequentQuestions = [
    { question: 'Where is my order?', count: 127 },
    { question: 'Do you ship to the Canary Islands?', count: 89 },
    { question: 'Can I change the size?', count: 56 },
    { question: 'When will my package arrive?', count: 134 },
    { question: 'Do you accept returns?', count: 72 }
  ];
  
  // Predefined messages for WOW simulation
  readonly simulationScript: Omit<SimulatedMessage, 'id' | 'timestamp'>[] = [
    { sender: 'user', message: 'Where is my order?', delay: 0 },
    { sender: 'bot', message: 'Hi! Let me check that. What\'s your order number?', delay: 1200 },
    { sender: 'user', message: '#12345', delay: 2500 },
    { sender: 'bot', message: 'Found it! Your order is on its way. It will arrive tomorrow between 9am-2pm. Anything else?', delay: 1800 },
    { sender: 'user', message: 'No, thanks!', delay: 2000 },
    { sender: 'bot', message: 'Perfect! Have a great day 😊', delay: 1000 }
  ];
  
  state: WizardState = {
    currentStep: 1,
    problemUnderstanding: false,
    simulationStarted: false,
    simulationMessages: [],
    currentSimulationIndex: 0,
    simulationCompleted: false,
    userQuestion: '',
    interactiveMessages: [],
    hasTriedInteractive: false,
    isInteractiveMode: false,
    showInteractivePrompt: false,
    showEmbedCode: false,
    embedCodeCopied: false,
    showPricingModal: false,
    showEmailCapture: false,
    userEmail: '',
    emailSubmitted: false,
    feedbackAnswer: null,
    feedbackSubmitted: false,
    feedbackComment: '',
    feedbackMessage: null,
    simulationViewed: false,
    interactiveUsed: false,
    loading: false,
    loadingStage: null,
    error: null
  };
  
  constructor(
    private router: Router,
    private trackingService: TrackingService,
    private previewService: ModulePreviewService,
    private route: ActivatedRoute
  ) {}
  
  async ngOnInit(): Promise<void> {
    // ✅ VALIDAR STATUS DEL MÓDULO ANTES DE PERMITIR ACCESO
    const canAccess = await this.validateModuleStatus();
    
    if (!canAccess) {
      this.isBlocked = true;
      console.warn(`⚠️ Smart Chat is in testing mode - public access blocked`);
      return; // No continuar con el wizard
    }
    
    // Track inicio del wizard
    this.trackingService.pageView('module_preview_started', {
      module: this.moduleKey,
      moduleName: this.moduleName
    });
    
    this.trackEvent('wizard_started', {
      source: this.isInternalAccess ? 'admin' : 'preview',
      timestamp: Date.now()
    });
    
    // 🎯 Track abandonment when user leaves without completing
    this.setupAbandonmentTracking();
  }
  
  ngOnDestroy(): void {
    // 🎯 Track abandonment if wizard not completed
    this.trackAbandonmentIfIncomplete();
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }
  
  // ==========================================
  // MODULE STATUS VALIDATION
  // ==========================================

  /**
   * Validar status del módulo antes de permitir acceso
   * 
   * Lógica:
   * - status='testing' + NO ?internal=true → ❌ Bloquear (coming soon)
   * - status='testing' + ?internal=true → ✅ Permitir (Admin Panel)
   * - status='live' → ✅ Permitir (público)
   * 
   * @returns true si el acceso está permitido, false si debe bloquearse
   */
  private async validateModuleStatus(): Promise<boolean> {
    try {
      // Detectar si es acceso interno desde Admin Panel
      this.isInternalAccess = this.route.snapshot.queryParams['internal'] === 'true';
      
      // Obtener configuración del módulo desde backend
      const response = await this.previewService.getPreviewConfig(this.moduleKey).toPromise();
      
      if (!response || !response.success || !response.config) {
        console.warn(`⚠️ No backend config for '${this.moduleKey}', allowing access by default`);
        return true;
      }
      
      const moduleStatus = response.config.status;
      
      console.log('🔒 Smart Chat - Status validation:', {
        module: this.moduleKey,
        status: moduleStatus,
        isInternalAccess: this.isInternalAccess
      });
      
      // ❌ Bloquear acceso si:
      // - Status = 'testing' Y NO tiene acceso interno autorizado
      if (moduleStatus === 'testing' && !this.isInternalAccess) {
        console.warn(`⚠️ Module '${this.moduleKey}' is in testing - public access blocked`);
        return false;
      }
      
      // ✅ Permitir acceso si:
      // - Status = 'live' (público)
      // - Status = 'testing' CON ?internal=true (Admin Panel)
      console.log(`✅ Access granted to module '${this.moduleKey}'`);
      return true;
      
    } catch (error) {
      console.error('❌ Error validating module status:', error);
      // En caso de error, bloquear acceso por seguridad
      return false;
    }
  }
  
  // ==========================================
  // Navegación entre pasos
  // ==========================================
  
  goToStep(step: 1 | 2 | 3): void {
    this.state.currentStep = step;
    
    // Track cambio de paso
    this.trackEvent('wizard_step_changed', {
      from: this.state.currentStep,
      to: step
    });
    
    // Auto-start simulation en paso 2
    if (step === 2 && !this.state.simulationStarted) {
      setTimeout(() => this.startSimulation(), 800);
    }
  }
  
  nextStep(): void {
    if (this.state.currentStep < 3) {
      const nextStep = (this.state.currentStep + 1) as 2 | 3;
      
      // Track paso completado
      this.trackEvent(`step_${this.state.currentStep}_completed`, {
        step: this.state.currentStep
      });
      
      this.goToStep(nextStep);
    }
  }
  
  goBack(): void {
    if (this.state.currentStep > 1) {
      this.goToStep((this.state.currentStep - 1) as 1 | 2 | 3);
    }
  }
  
  // ==========================================
  // Paso 1: Problema
  // ==========================================
  
  acknowledgeProble(): void {
    this.state.problemUnderstanding = true;
    
    this.trackEvent('problem_acknowledged', {
      frequent_questions_shown: this.frequentQuestions.length
    });
  }
  
  // ==========================================
  // Paso 2: Simulación WOW
  // ==========================================
  
  startSimulation(): void {
    this.state.simulationStarted = true;
    this.state.simulationMessages = [];
    this.state.currentSimulationIndex = 0;
    
    this.trackEvent('simulation_started', {
      message_count: this.simulationScript.length
    });
    
    this.showNextSimulatedMessage();
  }
  
  private showNextSimulatedMessage(): void {
    if (this.state.currentSimulationIndex >= this.simulationScript.length) {
      this.state.simulationCompleted = true;
      
      // Track simulación completa
      if (!this.state.simulationViewed) {
        this.trackEvent('simulation_completed', {
          duration_ms: this.simulationScript.reduce((acc, msg) => acc + (msg.delay || 0), 0),
          messages_count: this.simulationScript.length
        });
        this.state.simulationViewed = true;
      }
      
      // 🔥 Mostrar modal CTA agresivo para activar modo interactivo
      // Mejora: aumentar tasa de activación de 66.7% a >90%
      setTimeout(() => {
        this.state.showInteractivePrompt = true;
        this.trackEvent('interactive_prompt_shown', {
          step: 2,
          after_simulation: true
        });
      }, 800);
      
      return;
    }
    
    const scriptMessage = this.simulationScript[this.state.currentSimulationIndex];
    const delay = scriptMessage.delay || 1000;
    
    setTimeout(() => {
      const simulatedMessage: SimulatedMessage = {
        id: this.state.simulationMessages.length + 1,
        sender: scriptMessage.sender,
        message: scriptMessage.message,
        timestamp: new Date()
      };
      
      this.state.simulationMessages.push(simulatedMessage);
      this.state.currentSimulationIndex++;
      
      // Auto-scroll si es necesario
      this.scrollToBottom();
      
      // Mostrar siguiente mensaje
      this.showNextSimulatedMessage();
    }, delay);
  }
  
  replaySimulation(): void {
    this.trackEvent('simulation_replayed', {});
    this.startSimulation();
  }
  
  /**
   * Activa modo interactivo manualmente
   * El ÚNICO método para activar el modo interactivo (no hay auto-transition)
   */
  activateInteractiveMode(): void {
    // Activar modo interactivo
    this.state.isInteractiveMode = true;
    
    // Track activación manual
    this.trackEvent('interactive_mode_activated', {
      manual_click: true
    });
  }
  
  /**
   * 🎯 Aceptar prompt interactivo con quick question
   * Mejora tasa de activación de modo interactivo (de 66.7% a >90%)
   */
  acceptInteractivePrompt(question: string): void {
    // Cerrar modal
    this.state.showInteractivePrompt = false;
    
    // Track aceptación
    this.trackEvent('interactive_prompt_accepted', {
      question: question,
      step: 2
    });
    
    // Activar modo interactivo
    this.state.isInteractiveMode = true;
    this.trackEvent('interactive_mode_activated', {
      manual_click: false,
      via_prompt: true
    });
    
    // Auto-llenar la pregunta seleccionada
    this.state.userQuestion = question;
    
    // Auto-enviar la pregunta con delay para UX natural
    setTimeout(() => {
      this.askQuestion();
    }, 300);
  }
  
  /**
   * 🎯 Cerrar prompt sin activar
   */
  dismissInteractivePrompt(): void {
    this.state.showInteractivePrompt = false;
    
    // Track dismissal (señal de desinterés)
    this.trackEvent('interactive_prompt_dismissed', {
      step: 2,
      after_simulation: true
    });
  }
  
  // ==========================================
  // Paso 3: Preview Interactivo
  // ==========================================
  
  askQuestion(): void {
    if (!this.state.userQuestion.trim()) {
      return;
    }
    
    const currentQuestion = this.state.userQuestion.trim();
    
    const userMessage: SimulatedMessage = {
      id: this.state.interactiveMessages.length + 1,
      sender: 'user',
      message: currentQuestion,
      timestamp: new Date()
    };
    
    this.state.interactiveMessages.push(userMessage);
    
    // Track primera interacción
    if (!this.state.hasTriedInteractive) {
      this.trackEvent('interactive_first_question', {
        question: currentQuestion
      });
      this.state.hasTriedInteractive = true;
    } else {
      this.trackEvent('interactive_question_asked', {
        question: currentQuestion,
        question_number: Math.floor(this.state.interactiveMessages.length / 2) + 1
      });
    }
    
    // Limpiar input ANTES del setTimeout
    this.state.userQuestion = '';
    
    // 🎯 LOADING STATES PREMIUM (WOW perception)
    this.state.loading = true;
    this.state.loadingStage = 'thinking';
    
    // Stage 1: Thinking... (400ms)
    setTimeout(() => {
      this.state.loadingStage = 'analyzing';
    }, 400);
    
    // Stage 2: Analyzing context... (400ms)
    setTimeout(() => {
      this.state.loadingStage = 'generating';
    }, 800);
    
    // Stage 3: Generating response... then show response (400ms)
    setTimeout(() => {
      this.state.loading = false;
      this.state.loadingStage = null;
      
      const botResponse = this.generateBotResponse(currentQuestion);
      
      const botMessage: SimulatedMessage = {
        id: this.state.interactiveMessages.length + 1,
        sender: 'bot',
        message: botResponse.message,
        timestamp: new Date(),
        suggestedQuestions: botResponse.suggestions
      };
      
      this.state.interactiveMessages.push(botMessage);
      this.scrollToBottom();
    }, 1200);
    
    this.scrollToBottom();
  }
  
  // Handle suggested question chip clicks
  askSuggestedQuestion(question: string): void {
    this.state.userQuestion = question;
    this.askQuestion();
  }
  
  private generateBotResponse(question: string): { message: string; suggestions?: string[] } {
    const lowerQ = question.toLowerCase();
    
    // 🎯 Intent Detection with Contextual Responses
    // Each response includes specific simulated data to maintain WOW
    
    // 💬 GREETINGS - Quick acknowledgment + redirect to value
    if (/^(hi|hola|hey|hello|buenos dias|good morning)[\s!?]*$/i.test(lowerQ.trim())) {
      return {
        message: `Hi! 👋 I'm designed to handle the repetitive questions that usually take hours every day — like order tracking, shipping, and returns. Want to see how fast I can answer one?`,
        suggestions: ['Where is my order?', 'How much is shipping?', 'Can I return this?']
      };
    }
    
    // 🤝 REQUEST FOR HUMAN - Acknowledge + show value
    if (lowerQ.includes('person') || lowerQ.includes('agent') || lowerQ.includes('human') || 
        lowerQ.includes('hablar con') || lowerQ.includes('speak to')) {
      return {
        message: `Absolutely! I'm built to handle quick questions like order status, returns, or shipping — filtering out repetitive queries so your team focuses on complex issues. For anything else, I'd instantly connect you to a real person. Want to test the quick-answer flow?`,
        suggestions: ['Where is my order?', 'Shipping costs?', 'Return policy?']
      };
    }
    
    // 😤 FRUSTRATION - Empathy + clear expectations
    if (lowerQ.includes('not working') || lowerQ.includes('useless') || lowerQ.includes('help me') || 
        lowerQ.includes('broken') || lowerQ.includes('no funciona')) {
      return {
        message: `I'm still learning! Right now I'm built to handle common ecommerce questions. Want to try one of these?`,
        suggestions: ['Where is my order?', 'Can I return this?', 'Shipping costs?']
      };
    }
    
    // 🤔 PERSONAL / OFF-TOPIC - Friendly redirect
    if (lowerQ.includes('name') || lowerQ.includes('who are you') || lowerQ.includes('de donde') || 
        lowerQ.includes('where from') || lowerQ.includes('quien eres')) {
      return {
        message: `I'm a smart assistant focused on ecommerce support — the questions that eat up 3-4 hours daily. Want to test me?`,
        suggestions: ['Where is my order?', 'How much is shipping?', 'Return policy?']
      };
    }
    
    // ORDER TRACKING - Most common query
    if (lowerQ.includes('order') || lowerQ.includes('package') || lowerQ.includes('track') || 
        lowerQ.includes('where') || lowerQ.includes('delivery') || lowerQ.includes('pedido')) {
      const orderNum = this.generateRandomOrderNumber();
      const deliveryDate = this.getTomorrowDate();
      return {
        message: `I found your order #${orderNum}! It shipped yesterday and will arrive ${deliveryDate} between 9am-2pm. Want me to send tracking details to your email?`
      };
    }
    
    // SHIPPING LOCATIONS - General shipping to specific places
    if ((lowerQ.includes('ship') || lowerQ.includes('deliver') || lowerQ.includes('send')) && 
        (lowerQ.includes(' to ') || lowerQ.includes('madrid') || lowerQ.includes('barcelona') || 
         lowerQ.includes('valencia') || lowerQ.includes('spain') || lowerQ.includes('españa'))) {
      // Specific for Canary Islands (already handled above if user asks specifically)
      if (lowerQ.includes('canary') || lowerQ.includes('canarias') || lowerQ.includes('islands')) {
        return {
          message: `Yes! We ship to the Canary Islands. Delivery takes 4-6 business days and shipping is €12.99. You won't pay VAT, but customs may apply local IGIC (around 7%).`
        };
      }
      // General Spain shipping
      return {
        message: `Yes! We ship nationwide across Spain. Standard delivery (2-4 days) is €4.99, free on orders over €50. Express next-day delivery available for €9.99. Orders placed before 2pm ship same day!`
      };
    }
    
    // SHIPPING COSTS
    if (lowerQ.includes('shipping') || lowerQ.includes('cost') || lowerQ.includes('envío') || 
        lowerQ.includes('gastos') || lowerQ.includes('free')) {
      return {
        message: `Free shipping on orders over €50. Standard delivery (2-4 days) is €4.99, and Express (next day) is €9.99. Orders placed before 2pm ship same day!`
      };
    }
    
    // RETURNS & REFUNDS
    if (lowerQ.includes('return') || lowerQ.includes('refund') || lowerQ.includes('devolv') || 
        lowerQ.includes('change') || lowerQ.includes('size') || lowerQ.includes('wrong')) {
      return {
        message: `Returns are easy! You have 30 days to return any item for free. We'll email you a prepaid return label within 5 minutes. Refunds are processed in 2-3 business days after we receive the item.`
      };
    }
    
    // PAYMENT METHODS
    if (lowerQ.includes('pay') || lowerQ.includes('credit') || lowerQ.includes('paypal') || 
        lowerQ.includes('payment') || lowerQ.includes('card')) {
      return {
        message: `We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Google Pay. All payments are secure and encrypted. You can also pay in 3 installments with Klarna!`
      };
    }
    
    // PRODUCT AVAILABILITY
    if (lowerQ.includes('stock') || lowerQ.includes('available') || lowerQ.includes('color') || 
        lowerQ.includes('disponib')) {
      return {
        message: `Most items are in stock and ship within 24 hours! If something specific is out of stock, we restock weekly. Want me to notify you when a particular item is back?`
      };
    }
    
    // BUSINESS HOURS / CONTACT
    if (lowerQ.includes('hours') || lowerQ.includes('contact') || lowerQ.includes('schedule') || 
        lowerQ.includes('phone') || lowerQ.includes('horario')) {
      return {
        message: `Our support team is available Mon-Fri 9am-7pm and Sat 10am-2pm. You can also email us 24/7 at support@yourstore.com or call +34 900 123 456. Average response time: under 2 hours!`
      };
    }
    
    // DISCOUNTS / PROMO CODES
    if (lowerQ.includes('discount') || lowerQ.includes('coupon') || lowerQ.includes('promo') || 
        lowerQ.includes('code') || lowerQ.includes('descuento') || lowerQ.includes('offer')) {
      return {
        message: `Great timing! Use code WELCOME10 for 10% off your first order. We also have a loyalty program where you earn 1 point per €1 spent. 100 points = €5 discount!`
      };
    }
    
    // WARRANTY / GUARANTEE
    if (lowerQ.includes('warranty') || lowerQ.includes('guarantee') || lowerQ.includes('garantía') || 
        lowerQ.includes('defect')) {
      return {
        message: `All products come with a 2-year manufacturer warranty. If anything breaks, we'll replace it for free. We also offer a 100% satisfaction guarantee - if you're not happy, return it anytime within 30 days.`
      };
    }
    
    // ACCOUNT / LOGIN ISSUES
    if (lowerQ.includes('account') || lowerQ.includes('login') || lowerQ.includes('password') || 
        lowerQ.includes('reset') || lowerQ.includes('cuenta')) {
      return {
        message: `Having trouble logging in? I can send you a password reset link right now. Just confirm your email address and check your inbox in the next 2 minutes. Still stuck? Our tech team is here to help!`
      };
    }
    
    // 🎯 COMPLEX QUERIES - Acknowledge complexity + show handoff
    if (lowerQ.includes('tax') || lowerQ.includes('vat') || lowerQ.includes('customs') || 
        lowerQ.includes('export') || lowerQ.includes('import') || lowerQ.includes('legal')) {
      return {
        message: `That's a specialized question that needs expert handling. I'm focused on the 80% of questions that are repetitive — like tracking, returns, and shipping. For complex queries like this, I'd connect you with a real person who can help.`,
        suggestions: ['Where is my order?', 'Return policy?', 'Shipping costs?']
      };
    }
    
    // FALLBACK - Intelligent default that reinforces value
    return {
      message: `I'm built to answer customer questions like shipping, returns, and order tracking — the things that usually steal hours every day. Want to try one?`,
      suggestions: ['Where is my order?', 'How much is shipping?', 'Can I return this?']
    };
  }
  
  // Helper: Generate realistic order number
  private generateRandomOrderNumber(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }
  
  // Helper: Get tomorrow's date in readable format
  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return tomorrow.toLocaleDateString('en-US', options);
  }
  
  useQuickQuestion(question: string): void {
    this.state.userQuestion = question;
    this.trackEvent('quick_question_selected', { question });
    this.askQuestion();
  }
  
  // ==========================================
  // Paso 3: CTA + Pricing Blocker (WTP Signal)
  // ==========================================
  
  /**
   * Mostrar modal de pricing (Beta gratuita con ancla €49/mes)
   * Este es el PRIMER punto de validación de WTP
   */
  showPricing(): void {
    this.state.showPricingModal = true;
    
    this.trackEvent('pricing_modal_viewed', {
      step: 3,
      beta_pricing: true
    });
  }
  
  /**
   * Usuario hace click en "Claim Free Beta Access"
   * Track WTP signal + mostrar email capture
   */
  handlePricingClick(): void {
    this.trackEvent('pricing_clicked', {
      plan: 'beta',
      price: 0,
      price_anchor: 49,
      currency: 'EUR',
      step: 3,
      beta_pricing: true
    });
    
    // Cerrar pricing modal y mostrar email capture
    this.state.showPricingModal = false;
    this.state.showEmailCapture = true;
  }
  
  /**
   * Cerrar pricing modal sin conversión
   */
  closePricingModal(): void {
    this.trackEvent('pricing_dismissed', {
      step: 3
    });
    
    this.state.showPricingModal = false;
  }
  
  /**
   * Submit email para early access
   */
  submitEmail(): void {
    if (!this.state.userEmail.trim()) {
      this.state.error = 'Please enter a valid email';
      return;
    }
    
    // Validación simple de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.state.userEmail.trim())) {
      this.state.error = 'Please enter a valid email';
      return;
    }
    
    this.trackEvent('email_submitted', {
      email: this.state.userEmail.trim(),
      plan: 'beta',
      price: 0,
      price_anchor: 49,
      currency: 'EUR',
      intent: 'early_access',
      step: 3,
      beta_pricing: true
    });
    
    this.state.emailSubmitted = true;
    this.state.error = null;
    
    // Mostrar mensaje de éxito
    setTimeout(() => {
      this.state.showEmailCapture = false;
      this.state.feedbackMessage = '🎉 Thanks! We\'ll send you free beta access in 48h.';
    }, 1500);
    
    // Track wizard completion (submit email = conversión completa)
    this.trackEvent('wizard_completed', {
      step: 3,
      completed: true,
      email_captured: true,
      pricing_accepted: true
    });
  }
  
  /**
   * Cerrar email capture modal
   */
  closeEmailCapture(): void {
    this.trackEvent('email_capture_dismissed', {
      step: 3
    });
    
    this.state.showEmailCapture = false;
  }
  
  // ==========================================
  // Legacy: Embed Code (opcional, secundario al pricing)
  // ==========================================
  
  showCode(): void {
    this.state.showEmbedCode = true;
    
    this.trackEvent('embed_code_viewed', {
      step: 3
    });
  }
  
  copyEmbedCode(): void {
    const embedCode = this.getEmbedCode();
    
    navigator.clipboard.writeText(embedCode).then(() => {
      this.state.embedCodeCopied = true;
      
      this.trackEvent('embed_code_copied', {
        code_length: embedCode.length
      });
      
      setTimeout(() => {
        this.state.embedCodeCopied = false;
      }, 3000);
    });
  }
  
  getEmbedCode(): string {
    return `<!-- Inbox Zero Widget -->
<script>
  (function() {
    window.InboxZeroConfig = {
      tenantId: 'YOUR_TENANT_ID',
      color: '#4F46E5',
      position: 'bottom-right'
    };
    var script = document.createElement('script');
    script.src = 'https://cdn.inboxzero.app/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  }
  
  activateChat(): void {
    this.trackEvent('activate_clicked', {
      from_step: this.state.currentStep
    });
    
    // TODO: Redirigir a registro o activación
    alert('🎉 ¡Genial! Te redirigiremos al panel de configuración...');
  }
  
  // ==========================================
  // Feedback & Tracking
  // ==========================================
  
  submitFeedback(answer: 'yes' | 'partial' | 'no'): void {
    this.state.feedbackAnswer = answer;
    
    const properties = {
      module: this.moduleKey,
      answer: answer,
      timestamp: Date.now(),
      steps_completed: this.state.currentStep,
      simulation_viewed: this.state.simulationViewed,
      interactive_used: this.state.hasTriedInteractive
    };
    
    this.trackingService.track('wizard_feedback_answered', properties);
    
    // Mensajes personalizados
    if (answer === 'yes') {
      this.state.feedbackMessage = '¡Excelente! 🎉 Te avisaremos cuando esté disponible.';
      this.state.feedbackSubmitted = true;
    } else if (answer === 'partial') {
      this.state.feedbackMessage = 'Gracias por tu feedback. ¿Qué mejorarías?';
    } else {
      this.state.feedbackMessage = '¿Qué te faltó? Tu feedback es muy valioso.';
    }
  }
  
  submitComment(): void {
    if (this.state.feedbackComment.trim()) {
      this.trackingService.track('wizard_feedback_comment_submitted', {
        module: this.moduleKey,
        answer: this.state.feedbackAnswer,
        comment_length: this.state.feedbackComment.length,
        comment: this.state.feedbackComment
      });
      
      this.state.feedbackSubmitted = true;
      this.state.feedbackMessage = '¡Gracias! Tu opinión nos ayuda a mejorar.';
    }
  }
  
  // ==========================================
  // Helpers
  // ==========================================
  
  private trackEvent(eventName: string, data: any = {}): void {
    this.trackingService.track(eventName, {
      ...data,
      module: this.moduleKey,
      moduleName: this.moduleName,
      timestamp: Date.now()
    });
  }
  
  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }
  
  get canContinueStep1(): boolean {
    return this.state.problemUnderstanding;
  }
  
  get canContinueStep2(): boolean {
    // Paso 2 fusionado: requiere simulación completada + al menos 1 pregunta interactiva
    return this.state.simulationCompleted && this.state.hasTriedInteractive;
  }
  
  // ==========================================
  // Abandonment Tracking (PMF Validation)
  // ==========================================
  
  /**
   * Setup abandonment tracking via beforeunload event
   * Captures exact step and context when user leaves
   */
  private setupAbandonmentTracking(): void {
    window.addEventListener('beforeunload', () => {
      this.trackAbandonmentIfIncomplete();
    });
  }
  
  /**
   * Track abandonment if wizard not completed
   * Only fires if user hasn't submitted email (complete conversion)
   */
  private trackAbandonmentIfIncomplete(): void {
    // Don't track if wizard completed (email submitted)
    const isCompleted = this.state.emailSubmitted || this.state.feedbackSubmitted;
    
    if (!isCompleted) {
      this.trackEvent('wizard_abandoned', {
        step: this.state.currentStep,
        step_name: this.getStepName(this.state.currentStep),
        problem_acknowledged: this.state.problemUnderstanding,
        simulation_completed: this.state.simulationCompleted,
        simulation_viewed: this.state.simulationViewed,
        interactive_used: this.state.hasTriedInteractive,
        interactive_mode_activated: this.state.isInteractiveMode,
        questions_asked: Math.floor(this.state.interactiveMessages.length / 2),
        pricing_viewed: this.state.showPricingModal,
        email_capture_shown: this.state.showEmailCapture,
        module: this.moduleKey,
        source: this.isInternalAccess ? 'admin' : 'preview'
      });
    }
  }
  
  /**
   * Get human-readable step name for analytics
   */
  private getStepName(step: number): string {
    const stepNames: Record<number, string> = {
      1: 'problem_understanding',
      2: 'simulation_and_interactive',
      3: 'pricing_and_conversion'
    };
    return stepNames[step] || 'unknown';
  }
  
  get canContinueStep3(): boolean {
    return this.state.hasTriedInteractive;
  }
  
  /**
   * Volver al MVP Hub
   */
  goBackToHub(): void {
    this.router.navigate(['/']);
  }
}
