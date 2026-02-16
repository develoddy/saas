import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TrackingService } from '../../services/tracking.service';
import { ModulePreviewService } from '../../services/module-preview.service';

/**
 * Smart Chat Wizard Component
 * 
 * Wizard MVP de 4 pasos para validar el interés en chat automatizado
 * sin autenticación ni configuración técnica.
 * 
 * Flow (WOW-oriented):
 * 1. Mostrar problema real del comerciante
 * 2. Simulación en vivo de chat automático (WOW moment)
 * 3. Preview interactivo - probar con preguntas reales
 * 4. CTA con código embebible para instalación rápida
 * 
 * Ruta: /preview/smart-chat
 * 
 * Objetivo: Validar VALOR PERCIBIDO antes de construir producto completo
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
}

interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  
  // Paso 1: Problema
  problemUnderstanding: boolean;
  
  // Paso 2: Simulación WOW
  simulationStarted: boolean;
  simulationMessages: SimulatedMessage[];
  currentSimulationIndex: number;
  simulationCompleted: boolean;
  
  // Paso 3: Preview Interactivo
  userQuestion: string;
  interactiveMessages: SimulatedMessage[];
  hasTriedInteractive: boolean;
  
  // Paso 4: CTA & Install
  showEmbedCode: boolean;
  embedCodeCopied: boolean;
  
  // Feedback & Tracking (MVP Validation)
  feedbackAnswer: 'yes' | 'partial' | 'no' | null;
  feedbackSubmitted: boolean;
  feedbackComment: string;
  feedbackMessage: string | null;
  
  // Tracking flags
  simulationViewed: boolean;
  interactiveUsed: boolean;
  
  // General
  error: string | null;
  loading: boolean;
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
  readonly moduleKey = 'smart-chat';
  readonly moduleName = 'Smart Chat';
  
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
    showEmbedCode: false,
    embedCodeCopied: false,
    feedbackAnswer: null,
    feedbackSubmitted: false,
    feedbackComment: '',
    feedbackMessage: null,
    simulationViewed: false,
    interactiveUsed: false,
    error: null,
    loading: false
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
    
    this.trackEvent('smart_chat_wizard_started', {
      source: this.isInternalAccess ? 'admin' : 'preview',
      timestamp: Date.now()
    });
  }
  
  ngOnDestroy(): void {
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
  
  goToStep(step: 1 | 2 | 3 | 4): void {
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
    if (this.state.currentStep < 4) {
      const nextStep = (this.state.currentStep + 1) as 2 | 3 | 4;
      
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
  
  // ==========================================
  // Paso 3: Preview Interactivo
  // ==========================================
  
  askQuestion(): void {
    if (!this.state.userQuestion.trim()) {
      return;
    }
    
    const userMessage: SimulatedMessage = {
      id: this.state.interactiveMessages.length + 1,
      sender: 'user',
      message: this.state.userQuestion,
      timestamp: new Date()
    };
    
    this.state.interactiveMessages.push(userMessage);
    
    // Track primera interacción
    if (!this.state.hasTriedInteractive) {
      this.trackEvent('interactive_first_question', {
        question: this.state.userQuestion
      });
      this.state.hasTriedInteractive = true;
    } else {
      this.trackEvent('interactive_question_asked', {
        question: this.state.userQuestion,
        question_number: Math.floor(this.state.interactiveMessages.length / 2) + 1
      });
    }
    
    // Generar respuesta automática simulada
    setTimeout(() => {
      const botResponse = this.generateBotResponse(this.state.userQuestion);
      
      const botMessage: SimulatedMessage = {
        id: this.state.interactiveMessages.length + 1,
        sender: 'bot',
        message: botResponse,
        timestamp: new Date()
      };
      
      this.state.interactiveMessages.push(botMessage);
      this.scrollToBottom();
    }, 1200);
    
    // Limpiar input
    this.state.userQuestion = '';
    this.scrollToBottom();
  }
  
  private generateBotResponse(question: string): string {
    const lowerQ = question.toLowerCase();
    
    // Smart responses based on keywords
    if (lowerQ.includes('order') || lowerQ.includes('package') || lowerQ.includes('shipping') || lowerQ.includes('where')) {
      return 'I can check your order. What\'s your order number or email?';
    }
    
    if (lowerQ.includes('canary') || lowerQ.includes('canarias') || lowerQ.includes('islands')) {
      return 'Yes, we ship to the Canary Islands. Delivery takes 3-5 business days.';
    }
    
    if (lowerQ.includes('return') || lowerQ.includes('refund') || lowerQ.includes('change') || lowerQ.includes('size')) {
      return 'You have 30 days for free returns. Which product would you like to return?';
    }
    
    if (lowerQ.includes('hours') || lowerQ.includes('contact') || lowerQ.includes('schedule')) {
      return 'Our customer service hours are Mon-Fri 9am-6pm. How can I help you?';
    }
    
    if (lowerQ.includes('@') || lowerQ.includes('email')) {
      return 'Thanks! I\'ll connect you with an available agent. They\'ll contact you at that email shortly.';
    }
    
    // Generic response
    return 'Sure! Let me connect you with an available agent. What\'s your email?';
  }
  
  useQuickQuestion(question: string): void {
    this.state.userQuestion = question;
    this.trackEvent('quick_question_selected', { question });
    this.askQuestion();
  }
  
  // ==========================================
  // Paso 4: CTA & Install
  // ==========================================
  
  showCode(): void {
    this.state.showEmbedCode = true;
    
    this.trackEvent('embed_code_viewed', {
      step: 4
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
    return `<!-- Smart Chat Widget -->
<script>
  (function() {
    window.SmartChatConfig = {
      tenantId: 'YOUR_TENANT_ID',
      color: '#4F46E5',
      position: 'bottom-right'
    };
    var script = document.createElement('script');
    script.src = 'https://cdn.smartchat.app/widget.js';
    script.async = true;
    dosource: this.isInternalAccess ? 'admin' : 'preview', // ✅ Marcar tracking interno vs público
      cument.head.appendChild(script);
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
    return this.state.simulationCompleted;
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
