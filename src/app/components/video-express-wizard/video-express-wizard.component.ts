import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { VideoExpressService, VideoStatusResponse } from '../../services/video-express.service';
import { TrackingService } from '../../services/tracking.service';
import { ModulePreviewService } from '../../services/module-preview.service';
import { ProFeature, MonetizationContext } from '../pro-upgrade-block/pro-upgrade-block.component';
import { ProEmailData } from '../pro-modal/pro-modal.component';

/**
 * Video Express Wizard Component
 * 
 * Wizard MVP de 3 pasos para generar videos cortos de producto
 * sin autenticación ni configuración técnica.
 * 
 * Flow:
 * 1. Upload de imagen de producto
 * 2. Selección de objetivo (Orgánico vs Ads)
 * 3. Generación con polling automático
 * 4. Preview y descarga del video
 * 
 * Ruta: /preview/video-express
 * 
 * @author LujanDev
 * @module components/video-express-wizard
 */

/**
 * Guidance para uso del video generado
 * Sistema determinista basado en reglas para eliminar fatiga de decisión
 */
interface VideoUsageGuidance {
  goalLabel: string;
  bestPlatform: string;
  suggestedCaption: string;
  suggestedCTA: string;
}

/**
 * Sistema de notificaciones profesional (reemplaza alert())
 */
interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  
  // Paso 1
  uploadedImage: File | null;
  imagePreviewUrl: string | null;
  imageId: string | null;
  
  // Paso 2
  selectedObjective: 'organic' | 'ads' | null;
  selectedAnimation: 'zoom_in' | 'parallax' | 'subtle_float' | null;
  
  // Paso 3
  jobId: string | null;
  generationProgress: number;
  currentMessage: string;
  
  // Paso 4
  videoResult: {
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    fileSize: number;
    downloadUrl: string;
  } | null;
  
  // Video Usage Guidance (deterministic)
  usageGuidance: VideoUsageGuidance | null;
  
  // Feedback & Tracking (MVP Validation - igual que Mailflow)
  videoCompletedAt: Date | null; // Timestamp cuando se completó el video
  downloadedAt: Date | null; // Timestamp cuando el usuario descargó
  feedbackAnswer: 'yes' | 'partial' | 'no' | null; // 3 opciones como Mailflow
  feedbackSubmitted: boolean;
  showCommentBox: boolean; // Mostrar input de comentario si answer es 'no' o 'partial'
  feedbackComment: string; // Comentario del usuario
  feedbackMessage: string | null; // Mensaje personalizado post-feedback
  
  // Tracking flags para evitar duplicados
  usageGuidanceViewed: boolean;
  
  // Module Access Control (FASE 1)
  isBlocked: boolean; // True si el módulo está bloqueado (testing sin ?internal=true)
  
  // General
  error: string | null;
  loading: boolean;
}

@Component({
  selector: 'app-video-express-wizard',
  templateUrl: './video-express-wizard.component.html',
  styleUrls: ['./video-express-wizard.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class VideoExpressWizardComponent implements OnInit, OnDestroy {
  
  // Integración con sistema de módulos
  readonly moduleKey = 'video-express';
  readonly moduleName = 'Video Express';
  
  private destroy$ = new Subject<void>();
  
  // 🎯 FASE 2: Tracking Source (admin vs preview)
  public isInternalAccess: boolean = false; // true si acceso con ?internal=true
  
  // Mensajes rotativos para step 3
  private readonly loadingMessages = [
    'Analyzing your product...',
    'Applying cinematic motion...',
    'Optimizing for social media...',
    'Final touches...',
    'Almost ready...'
  ];
  
  private messageInterval: any;
  private currentMessageIndex = 0;
  
  // Download state
  isDownloading: boolean = false;
  
  // Notification system
  notifications: Notification[] = [];
  private notificationIdCounter = 0;
  
  // Monetization Experiment (Lean MVP)
  showProModal = false;
  proFeatures: ProFeature[] = [
    {
      icon: 'bi bi-collection-play-fill',
      label: 'Batch video generation',
      description: 'Upload 50+ images at once'
    },
    {
      icon: 'bi bi-badge-hd-fill',
      label: '4K export quality',
      description: 'Professional-grade output'
    },
    {
      icon: 'bi bi-palette-fill',
      label: 'Custom branding',
      description: 'Add logos, colors, and fonts'
    }
  ];
  
  // Drag & drop state
  isDragOver: boolean = false;
  
  // Opciones de animación disponibles (sync con admin panel)
  animationOptions: Array<{
    value: 'zoom_in' | 'parallax' | 'subtle_float';
    label: string;
    icon: string;
    description: string;
    recommended?: boolean;
  }> = [
    {
      value: 'parallax',
      label: 'Parallax 3D',
      icon: 'bi bi-badge-3d',
      description: 'Cinematic depth effect',
      recommended: true
    },
    {
      value: 'zoom_in',
      label: 'Zoom In',
      icon: 'bi bi-zoom-in',
      description: 'Smooth professional zoom'
    },
    {
      value: 'subtle_float',
      label: 'Subtle Float',
      icon: 'bi bi-arrows-move',
      description: 'Delicate elegant levitation'
    }
  ];
  
  state: WizardState = {
    currentStep: 1,
    uploadedImage: null,
    imagePreviewUrl: null,
    imageId: null,
    selectedObjective: null,
    selectedAnimation: 'parallax', // Default: Parallax 3D
    jobId: null,
    generationProgress: 5, // 🎯 Iniciar en 5% para feedback inmediato
    currentMessage: this.loadingMessages[0],
    videoResult: null,
    usageGuidance: null,
    videoCompletedAt: null,
    downloadedAt: null,
    feedbackAnswer: null,
    feedbackSubmitted: false,
    showCommentBox: false,
    feedbackComment: '',
    feedbackMessage: null,
    usageGuidanceViewed: false,
    isBlocked: false,
    error: null,
    loading: false
  };
  
  constructor(
    private videoExpressService: VideoExpressService,
    private trackingService: TrackingService,
    private previewService: ModulePreviewService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    // ✅ FASE 1: Validar status del módulo antes de permitir acceso
    const isAccessAllowed = await this.validateModuleStatus();
    
    if (!isAccessAllowed) {
      // Bloquear wizard completamente - NO permitir interacción
      this.state.isBlocked = true;
      this.state.error = '🚀 Coming soon! This module is in private testing.';
      this.state.loading = false;
      return;
    }
    
    // Track wizard started con integración de módulos
    this.trackingService.pageView('module_preview_started', {
      module: this.moduleKey,
      moduleName: this.moduleName,
      source: this.isInternalAccess ? 'admin' : 'preview',
      wizardType: 'custom'
    });
    
    this.trackEvent('video_express_wizard_started', {
      module: this.moduleKey
    });
  }

  ngOnDestroy(): void {
    // Cleanup
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
    
    if (this.state.imagePreviewUrl) {
      this.videoExpressService.revokeImagePreview(this.state.imagePreviewUrl);
    }
    
    this.videoExpressService.stopPolling();
  }

  // ==========================================
  // MODULE STATUS VALIDATION (FASE 1)
  // ==========================================

  /**
   * Validar status del módulo antes de permitir acceso
   * 
   * Lógica:
   * - status='testing' + NO ?internal=true → ❌ Bloquear (coming soon)
   * - status='testing' + ?internal=true → ✅ Permitir (Admin Panel)
   * - status='live' → ✅ Permitir (público)
   * 
   * Fallback para módulos custom (video-express):
   * - Si no hay config en BD, usar status hardcoded (live por defecto)
   * - Esto permite que wizards custom funcionen sin depender de BD
   * 
   * @returns true si el acceso está permitido, false si debe bloquearse
   */
  private async validateModuleStatus(): Promise<boolean> {
    try {
      // Detectar si es acceso interno desde Admin Panel
      this.isInternalAccess = this.route.snapshot.queryParams['internal'] === 'true';
      
      let moduleStatus: string;
      
      // Intentar obtener configuración del módulo desde backend
      try {
        const response = await this.previewService.getPreviewConfig(this.moduleKey).toPromise();
        
        if (response && response.success && response.config) {
          moduleStatus = response.config.status;
          console.log('✅ Loaded module config from backend:', { moduleKey: this.moduleKey, status: moduleStatus });
        } else {
          throw new Error('Config not found in backend');
        }
        
      } catch (backendError) {
        // ✅ FALLBACK: Si no hay config en BD, usar status hardcoded
        // Esto permite que módulos custom como video-express funcionen sin depender de BD
        console.warn(`⚠️ No backend config for '${this.moduleKey}', using hardcoded status`);
        
        // Por defecto: 'live' (wizard custom ya está en producción)
        // Si se requiere testing, agregar el módulo a la tabla modules en BD
        moduleStatus = 'live';
        
        console.log('✅ Using hardcoded status:', { moduleKey: this.moduleKey, status: moduleStatus });
      }
      
      console.log('🔒 Video Express - Status validation:', {
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
      // En caso de error crítico, permitir acceso (fail-safe para módulos custom)
      // Video Express ya está funcionando en producción, no debe bloquearse por error de validación
      console.warn('⚠️ Bypassing validation due to error (custom module)');
      return true;
    }
  }

  // ==========================================
  // STEP 1: Image Upload
  // ==========================================

  /**
   * Maneja el evento de cambio del input file
   */
  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      this.onImageSelected(files[0]);
    }
  }

  /**
   * Maneja el evento drop (arrastrar y soltar)
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onImageSelected(files[0]);
    }
  }

  /**
   * Maneja el evento dragover (cuando el archivo está sobre la zona)
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Maneja el evento dragleave (cuando el archivo sale de la zona)
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Maneja la selección de archivo de imagen
   */
  onImageSelected(file: File): void {
    this.state.error = null;
    
    // 🚀 Activar loading inmediatamente
    this.state.loading = true;
    
    // Validar imagen
    const validation = this.videoExpressService.validateImageFile(file);
    if (validation !== true) {
      this.state.error = validation;
      this.state.loading = false; // Desactivar loading si hay error
      return;
    }
    
    // Limpiar preview anterior si existe
    if (this.state.imagePreviewUrl) {
      this.videoExpressService.revokeImagePreview(this.state.imagePreviewUrl);
    }
    
    // Guardar imagen
    this.state.uploadedImage = file;
    
    // 🚀 Crear preview con setTimeout para mostrar loading (mejora UX)
    setTimeout(() => {
      this.state.imagePreviewUrl = this.videoExpressService.createImagePreview(file);
      this.state.loading = false;
      console.log('✅ Imagen procesada:', file.name);
    }, 600); // 600ms mínimo para percepción suave del skeleton
  }

  /**
   * Sube la imagen al servidor y avanza al paso 2
   */
  uploadImage(): void {
    if (!this.state.uploadedImage) {
      this.state.error = 'Please select an image';
      return;
    }
    
    this.state.loading = true;
    this.state.error = null;
    
    this.videoExpressService.uploadImage(this.state.uploadedImage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Imagen subida:', response);
          
          this.state.imageId = response.imageId;
          this.state.loading = false;
          
          // Track event
          this.trackEvent('video_express_image_uploaded', {
            fileSize: this.state.uploadedImage!.size,
            fileType: this.state.uploadedImage!.type
          });
          
          // Avanzar a paso 2
          this.goToStep(2);
        },
        error: (error) => {
          console.error('❌ Error subiendo imagen:', error);
          this.state.error = error.message || 'We could not process your image. Try again.';
          this.state.loading = false;
        }
      });
  }

  /**
   * Permite cambiar la imagen seleccionada
   */
  changeImage(): void {
    if (this.state.imagePreviewUrl) {
      this.videoExpressService.revokeImagePreview(this.state.imagePreviewUrl);
    }
    
    this.state.uploadedImage = null;
    this.state.imagePreviewUrl = null;
    this.state.error = null;
    this.state.loading = false;
  }

  // ==========================================
  // STEP 2: Objective & Animation Selection
  // ==========================================

  /**
   * Selecciona el objetivo del video
   */
  selectObjective(objective: 'organic' | 'ads'): void {
    this.state.selectedObjective = objective;
    this.state.error = null;
  }

  /**
   * Selecciona el estilo de animación
   */
  selectAnimation(animation: 'zoom_in' | 'parallax' | 'subtle_float'): void {
    this.state.selectedAnimation = animation;
    this.state.error = null;
  }

  /**
   * Genera el video con el objetivo y animación seleccionados
   */
  generateVideo(): void {
    if (!this.state.imageId || !this.state.selectedObjective) {
      this.state.error = 'Select a goal';
      return;
    }
    
    if (!this.state.selectedAnimation) {
      this.state.error = 'Select an animation style';
      return;
    }
    
    this.state.loading = true;
    this.state.error = null;
    
    this.videoExpressService.generateVideo(
      this.state.imageId,
      this.state.selectedObjective,
      this.state.selectedAnimation // 🆕 Nuevo parámetro
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Generación iniciada:', response);
          
          this.state.jobId = response.jobId;
          this.state.loading = false;
          
          // Track event
          this.trackEvent('video_express_objective_selected', {
            objective: this.state.selectedObjective,
            animation: this.state.selectedAnimation
          });
          
          // Avanzar a paso 3 e iniciar polling
          this.goToStep(3);
          this.startGenerationPolling();
        },
        error: (error) => {
          console.error('❌ Error iniciando generación:', error);
          this.state.error = error.message || 'No pudimos iniciar la generación. Intenta de nuevo.';
          this.state.loading = false;
        }
      });
  }

  // ==========================================
  // STEP 3: Generation with Polling
  // ==========================================

  /**
   * Inicia el polling del estado de generación
   */
  private startGenerationPolling(): void {
    if (!this.state.jobId) return;
    
    const startTime = Date.now();
    
    // 🔔 Solicitar permisos de notificaciones del browser
    this.requestNotificationPermission();
    
    // Iniciar mensajes rotativos
    this.startRotatingMessages();
    
    // Polling cada 2 segundos (optimizado para reducir latencia)
    this.videoExpressService.pollVideoStatus(this.state.jobId, 2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status: VideoStatusResponse) => {
          
          // Actualizar progreso con valor real del backend
          if (status.progress !== undefined && status.progress !== null) {
            this.state.generationProgress = status.progress;
            
            // Log solo cuando hay cambios significativos (cada 10%)
            if (status.progress % 10 === 0 || status.progress === 100) {
              console.log(`📈 Video generation: ${status.progress}%`);
            }
          } else {
            // Fallback local solo si backend no envía progreso
            if (this.state.generationProgress < 85) {
              this.state.generationProgress += 2;
            }
          }
          
          // Si completó
          if (status.status === 'completed') {
            const generationTime = Math.round((Date.now() - startTime) / 1000);
            
            this.state.videoResult = {
              videoUrl: status.videoUrl!,
              thumbnailUrl: status.thumbnailUrl!,
              duration: status.duration!,
              fileSize: status.fileSize!,
              downloadUrl: status.downloadUrl!
            };
            
            // � Calcular guía de uso (determinista, basada en objetivo)
            this.state.usageGuidance = this.getVideoUsageGuidance(this.state.selectedObjective!);
            
            // �📅 Guardar timestamp de completado (para calcular tiempo hasta feedback)
            this.state.videoCompletedAt = new Date();            
            // 📊 Track que el bloque de guidance será visible (tracking cuando avance a step 4)
            // Lo hacemos en goToStep(4) para asegurar que se muestre            
            // Track success: video generado
            this.trackEvent('video_express_video_generated', {
              jobId: this.state.jobId,
              objective: this.state.selectedObjective,
              generationTime
            });
            
            // ✅ Track wizard completion (definición MVP: video generado = wizard completado)
            this.trackEvent('wizard_completed', {
              step: 4,
              completed: true,
              module: this.moduleKey,
              objective: this.state.selectedObjective,
              animation: this.state.selectedAnimation,
              jobId: this.state.jobId
            });
            
            // Detener polling y mensajes
            this.videoExpressService.stopPolling();
            this.stopRotatingMessages();
            
            // 🔔 Mostrar notificación del browser
            this.showBrowserNotification('Your video is ready!', 
              'Click here to view your cinematic product video');
            
            // Avanzar a paso 4
            setTimeout(() => {
              this.goToStep(4);
            }, 500);
          }
          
          // Si falló
          if (status.status === 'failed') {
            this.state.error = status.error || 'We could not generate your video';
            this.stopRotatingMessages();
            this.videoExpressService.stopPolling();
          }
        },
        error: (error) => {
          console.error('❌ Error en polling:', error);
          this.state.error = 'We lost the connection. Try again.';
          this.stopRotatingMessages();
        }
      });
  }

  /**
   * Inicia la rotación de mensajes durante la generación
   */
  private startRotatingMessages(): void {
    this.currentMessageIndex = 0;
    this.state.currentMessage = this.loadingMessages[0];
    
    this.messageInterval = setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
      this.state.currentMessage = this.loadingMessages[this.currentMessageIndex];
    }, 3000); // Cambiar cada 3 segundos
  }

  /**
   * Detiene la rotación de mensajes
   */
  private stopRotatingMessages(): void {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
  }

  // ==========================================
  // STEP 4: Video Ready
  // ==========================================

  /**
   * Obtiene la guía de uso determinista del video basada en el objetivo
   * 
   * Sistema simple de reglas para eliminar fatiga de decisión.
   * NO genera texto dinámico, solo mapea objetivos a sugerencias predefinidas.
   * 
   * @param objective - El objetivo seleccionado por el usuario
   * @returns VideoUsageGuidance con plataforma, caption y CTA recomendados
   */
  private getVideoUsageGuidance(objective: 'organic' | 'ads'): VideoUsageGuidance {
    // Mapeo determinista: objetivo → guía de uso
    const guidanceMap: Record<'organic' | 'ads', VideoUsageGuidance> = {
      organic: {
        goalLabel: 'Engagement',
        bestPlatform: 'Instagram Reels',
        suggestedCaption: 'This is what happens when your customers love your product 👇',
        suggestedCTA: 'Save it and share it'
      },
      ads: {
        goalLabel: 'Ventas',
        bestPlatform: 'Instagram Ads',
        suggestedCaption: 'El producto que necesitas, al precio que mereces 💙',
        suggestedCTA: 'Conseguir el mío'
      }
    };

    return guidanceMap[objective];
  }

  /**
   * Descarga el video generado
   */
  downloadVideo(): void {
    if (!this.state.jobId || this.isDownloading) return;
    
    this.isDownloading = true;
    
    // Track download con estructura completa (igual que otros eventos)
    this.trackEvent('video_downloaded', {
      video_id: this.state.jobId,
      objective: this.state.selectedObjective,
      caption_version: 'v1'
    });
    
    const filename = `product-video-${Date.now()}.mp4`;
    
    this.videoExpressService.downloadVideo(this.state.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          // Crear link de descarga
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
          
          // 📅 Guardar timestamp de descarga (para calcular downloadTime en feedback)
          this.state.downloadedAt = new Date();
          
          this.isDownloading = false;
        },
        error: (error) => {
          console.error('Error descargando video:', error);
          this.state.error = 'Error al descargar el video. Intenta nuevamente.';
          this.isDownloading = false;
        }
      });
  }

  /**
   * Reinicia el wizard para crear otro video
   */
  createAnotherVideo(): void {
    // Track acción de crear otro video
    this.trackingService.track('create_another_video', {
      module: this.moduleKey,
      fromJobId: this.state.jobId,
      hadFeedback: this.state.feedbackSubmitted,
      feedbackAnswer: this.state.feedbackAnswer
    });
    
    // Limpiar estado
    if (this.state.imagePreviewUrl) {
      this.videoExpressService.revokeImagePreview(this.state.imagePreviewUrl);
    }
    
    this.videoExpressService.reset();
    
    // Reset state completo
    this.state = {
      currentStep: 1,
      uploadedImage: null,
      imagePreviewUrl: null,
      imageId: null,
      selectedObjective: null,
      selectedAnimation: 'parallax',
      jobId: null,
      generationProgress: 0,
      currentMessage: this.loadingMessages[0],
      videoResult: null,
      usageGuidance: null,
      videoCompletedAt: null,
      downloadedAt: null,
      feedbackAnswer: null,
      feedbackSubmitted: false,
      showCommentBox: false,
      feedbackComment: '',
      feedbackMessage: null,
      usageGuidanceViewed: false,
      isBlocked: false,
      error: null,
      loading: false
    };
    
    this.currentMessageIndex = 0;
  }

  /**
   * MVP Validation: Manejar respuesta de feedback (patrón Mailflow)
   * @param answer - 'yes' | 'partial' | 'no'
   */
  handleFeedbackAnswer(answer: 'yes' | 'partial' | 'no'): void {
    this.state.feedbackAnswer = answer;
    this.state.showCommentBox = (answer === 'no' || answer === 'partial');
    
    // Si es "yes", enviar tracking inmediatamente
    if (answer === 'yes') {
      this.submitFeedback();
    }
  }

  /**
   * MVP Validation: Enviar feedback con tracking (igual estructura que Mailflow)
   */
  private submitFeedback(comment?: string): void {
    if (!this.state.feedbackAnswer || !this.state.jobId) return;
    
    const properties: any = {
      answer: this.state.feedbackAnswer,
      module: this.moduleKey,
      source: this.isInternalAccess ? 'admin' : 'preview',
      video_id: this.state.jobId,
      objective: this.state.selectedObjective,
      caption_version: 'v1'
    };
    
    if (comment) {
      properties.comment = comment;
    }
    
    // Track con estructura idéntica a Mailflow
    this.trackingService.track('wizard_feedback_answered', properties);
    
    this.state.feedbackSubmitted = true;
    
    // Mensaje personalizado según feedback
    if (this.state.feedbackAnswer === 'yes') {
      this.state.feedbackMessage = 'Thank you for your feedback!';
    } else if (this.state.feedbackAnswer === 'partial') {
      this.state.feedbackMessage = "Thanks. We'll keep improving the system";
    } else {
      this.state.feedbackMessage = "Thank you for your feedback. We'll use it to improve";
    }
    
    console.log('✅ Feedback submitted:', properties);
  }

  /**
   * MVP Validation: Enviar feedback con comentario (si es 'no' o 'partial')
   */
  submitFeedbackWithComment(): void {
    if (!this.state.feedbackComment.trim() && this.state.feedbackAnswer !== 'yes') {
      // Si no hay comentario pero ya seleccionó respuesta, enviar de todos modos
      this.submitFeedback();
      return;
    }
    
    const comment = this.state.feedbackComment.trim();
    
    // Enviar feedback principal con comentario
    this.submitFeedback(comment);
    
    // Track evento adicional de comentario enviado
    if (comment) {
      this.trackingService.track('wizard_feedback_comment_submitted', {
        comment,
        answer: this.state.feedbackAnswer,
        video_id: this.state.jobId,
        objective: this.state.selectedObjective,
        caption_version: 'v1',
        module: this.moduleKey,
        source: this.isInternalAccess ? 'admin' : 'preview'
      });
    }
  }

  // ==========================================
  // Navigation & Helpers
  // ==========================================

  /**
   * Navega a un paso específico
   */
  private goToStep(step: 1 | 2 | 3 | 4): void {
    this.state.currentStep = step;
    
    // Track cuando se muestra el bloque de "Cómo usar este video" (paso 4)
    if (step === 4 && !this.state.usageGuidanceViewed && this.state.usageGuidance) {
      this.trackingService.track('usage_guidance_viewed', {
        video_id: this.state.jobId,
        objective: this.state.selectedObjective,
        caption_version: 'v1',
        module: this.moduleKey,
        source: this.isInternalAccess ? 'admin' : 'preview'
      });
      this.state.usageGuidanceViewed = true;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Retrocede al paso anterior (solo para debugging)
   */
  goBack(): void {
    if (this.state.currentStep > 1) {
      this.goToStep((this.state.currentStep - 1) as 1 | 2 | 3 | 4);
    }
  }

  /**
   * Helper para tracking de eventos (integrado con sistema de módulos)
   */
  private trackEvent(eventName: string, data: any = {}): void {
    this.trackingService.track(eventName, {
      ...data,
      module: this.moduleKey,
      moduleName: this.moduleName,
      timestamp: Date.now()
    });
  }

  /**
   * Getter para validaciones
   */
  get canContinueStep1(): boolean {
    return !!this.state.uploadedImage && !this.state.loading;
  }

  get canContinueStep2(): boolean {
    return !!this.state.selectedObjective && 
           !!this.state.selectedAnimation && 
           !this.state.loading;
  }

  // ==========================================
  // Post-Feedback Actions
  // ==========================================

  /**
   * Compartir video en redes sociales
   */
  shareOnSocial(): void {
    // Track acción
    this.trackingService.track('share_video_clicked', {
      module: this.moduleKey,
      jobId: this.state.jobId,
      fromFeedback: true,
      feedbackAnswer: this.state.feedbackAnswer
    });

    // Abrir modal o compartir nativo
    if (navigator.share && this.state.videoResult) {
      navigator.share({
        title: '¡Mira mi nuevo video de producto!',
        text: 'Creé este video profesional en segundos con Video Express',
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: mostrar opciones de compartir
      this.showNotification('🚀 Share your video on Instagram, Facebook or TikTok to maximize its impact!', 'info', 4000);
    }
  }

  /**
   * Copiar caption sugerido al portapapeles
   */
  copyCaption(caption: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(caption)
        .then(() => {
          // Track acción con estructura completa (igual que otros eventos)
          this.trackingService.track('caption_copied', {
            video_id: this.state.jobId,
            objective: this.state.selectedObjective,
            caption_version: 'v1',
            caption: caption,
            module: this.moduleKey,
            source: this.isInternalAccess ? 'admin' : 'preview'
          });
          
          // Feedback visual profesional
          this.showNotification('✅ Caption copied! Now paste it in your post.', 'success', 3000);
        })
        .catch(err => {
          console.error('Error copiando al portapapeles:', err);
          this.showNotification('⚠️ Could not copy the text. Try manually.', 'error', 4000);
        });
    } else {
      // Fallback para navegadores antiguos
      this.showNotification('Copy this text:\n\n' + caption, 'info', 6000);
    }
  }

  /**
   * Abrir chat de soporte o formulario de feedback
   */
  openSupportChat(): void {
    // Track acción
    this.trackingService.track('support_chat_opened', {
      module: this.moduleKey,
      jobId: this.state.jobId,
      fromNegativeFeedback: true
    });

    // Abrir chat (integrar con sistema de soporte real)
    this.showNotification('We will enable direct chat soon. For now, email us at support@yourdomain.com 💪', 'info', 6000);
  }
  
  /**
   * Sistema de notificaciones profesional (reemplaza alert)
   */
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void {
    const notification: Notification = {
      id: ++this.notificationIdCounter,
      message,
      type,
      duration
    };
    
    this.notifications.push(notification);
    
    // Auto-remover después de duration
    if (duration > 0) {
      setTimeout(() => {
        this.closeNotification(notification.id);
      }, duration);
    }
  }
  
  /**
   * Cerrar notificación específica
   */
  closeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
  
  // ==========================================
  // Browser Notifications (🚀 UX OPTIMIZADO)
  // ==========================================
  
  /**
   * Solicitar permisos de notificaciones del browser
   */
  private requestNotificationPermission(): void {
    if (!('Notification' in window)) {
      console.log('❌ Browser no soporta notificaciones');
      return;
    }
    
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Permisos de notificación:', permission);
        
        // Track si el usuario acepta o rechaza
        this.trackingService.track('notification_permission_response', {
          permission,
          module: this.moduleKey,
          context: 'video_generation'
        });
      });
    }
  }
  
  /**
   * Mostrar notificación del browser
   */
  private showBrowserNotification(title: string, body: string): void {
    if (!('Notification' in window)) {
      return;
    }
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/assets/icons/video-express-icon.png',
        badge: '/assets/icons/badge.png',
        tag: 'video-ready',
        requireInteraction: false,
        silent: false
      });
      
      // Click en notificación = volver a la pestaña
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Track click en notificación
        this.trackingService.track('browser_notification_clicked', {
          module: this.moduleKey,
          jobId: this.state.jobId
        });
      };
      
      // Auto-cerrar después de 5 segundos
      setTimeout(() => notification.close(), 5000);
      
      console.log('🔔 Notificación del browser mostrada');
    } else if (Notification.permission === 'default') {
      // Si todavía no han respondido, solicitar permisos
      this.requestNotificationPermission();
    }
  }
  
  // ==========================================
  // Monetization Experiment Methods
  // ==========================================
  
  /**
   * Handle click en "Upgrade to Pro"
   */
  handleProUpgrade(contextData: MonetizationContext): void {
    // Track monetization intent
    this.trackingService.trackMonetizationIntent({
      ...contextData,
      video_id: this.state.jobId,
      objective: this.state.selectedObjective,
      animation: this.state.selectedAnimation
    });
    
    // Mostrar modal
    this.showProModal = true;
    
    console.log('💰 Pro upgrade clicked:', contextData);
  }
  
  /**
   * Handle submit de email en Pro Modal
   */
  handleProEmailSubmit(emailData: ProEmailData): void {
    // Track conversion (intent → email)
    this.trackingService.trackProEmailSubmitted(emailData);
    
    console.log('📧 Pro email submitted:', emailData);
    
    // Modal se cerrará automáticamente después de 3 segundos
  }
  
  /**
   * Handle cierre de Pro Modal
   */
  handleProModalClose(): void {
    if (!this.showProModal) return;
    
    // Track dismissal para medir drop-off
    this.trackingService.trackProModalDismissed({
      module: this.moduleKey,
      reason: 'close_button'
    });
    
    this.showProModal = false;
  }
}
