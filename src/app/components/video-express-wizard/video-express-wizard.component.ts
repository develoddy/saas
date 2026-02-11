import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { VideoExpressService, VideoStatusResponse } from '../../services/video-express.service';
import { TrackingService } from '../../services/tracking.service';

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
  
  // Mensajes rotativos para step 3
  private readonly loadingMessages = [
    'Analizando tu producto...',
    'Aplicando movimiento cinematográfico...',
    'Optimizando para redes sociales...',
    'Últimos detalles...',
    'Ya casi está listo...'
  ];
  
  private messageInterval: any;
  private currentMessageIndex = 0;
  
  // Download state
  isDownloading: boolean = false;
  
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
      description: 'Efecto de profundidad cinematográfico',
      recommended: true
    },
    {
      value: 'zoom_in',
      label: 'Zoom In',
      icon: 'bi bi-zoom-in',
      description: 'Acercamiento suave y profesional'
    },
    {
      value: 'subtle_float',
      label: 'Subtle Float',
      icon: 'bi bi-arrows-move',
      description: 'Levitación delicada y elegante'
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
    error: null,
    loading: false
  };
  
  constructor(
    private videoExpressService: VideoExpressService,
    private trackingService: TrackingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Track wizard started con integración de módulos
    this.trackingService.pageView('module_preview_started', {
      module: this.moduleKey,
      moduleName: this.moduleName,
      source: 'preview',
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
    
    // Validar imagen
    const validation = this.videoExpressService.validateImageFile(file);
    if (validation !== true) {
      this.state.error = validation;
      return;
    }
    
    // Limpiar preview anterior si existe
    if (this.state.imagePreviewUrl) {
      this.videoExpressService.revokeImagePreview(this.state.imagePreviewUrl);
    }
    
    // Guardar imagen y crear preview
    this.state.uploadedImage = file;
    this.state.imagePreviewUrl = this.videoExpressService.createImagePreview(file);
    
    console.log('✅ Imagen seleccionada:', file.name);
  }

  /**
   * Sube la imagen al servidor y avanza al paso 2
   */
  uploadImage(): void {
    if (!this.state.uploadedImage) {
      this.state.error = 'Por favor selecciona una imagen';
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
          this.state.error = error.message || 'No pudimos procesar tu imagen. Intenta de nuevo.';
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
      this.state.error = 'Selecciona un objetivo';
      return;
    }
    
    if (!this.state.selectedAnimation) {
      this.state.error = 'Selecciona un estilo de animación';
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
    
    // Iniciar mensajes rotativos
    this.startRotatingMessages();
    
    // Polling cada 5 segundos
    this.videoExpressService.pollVideoStatus(this.state.jobId, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status: VideoStatusResponse) => {
          console.log('📊 Estado del video:', status);
          
          // Actualizar progreso
          if (status.progress !== undefined) {
            this.state.generationProgress = status.progress;
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
            
            // Avanzar a paso 4
            setTimeout(() => {
              this.goToStep(4);
            }, 500);
          }
          
          // Si falló
          if (status.status === 'failed') {
            this.state.error = status.error || 'No pudimos generar tu video';
            this.stopRotatingMessages();
            this.videoExpressService.stopPolling();
          }
        },
        error: (error) => {
          console.error('❌ Error en polling:', error);
          this.state.error = 'Perdimos la conexión. Intenta de nuevo.';
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
        suggestedCaption: 'Esto es lo que pasa cuando tus clientes aman tu producto 👇',
        suggestedCTA: 'Guárdalo y compártelo'
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
      source: 'preview',
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
        source: 'preview'
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
        source: 'preview'
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
      alert('¡Comparte tu video en Instagram, Facebook o TikTok para maximizar su impacto! 🚀');
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
            source: 'preview'
          });
          
          // Feedback visual (puedes mejorar esto con un toast/notification)
          alert('¡Texto copiado! Ahora pégalo en tu publicación.');
        })
        .catch(err => {
          console.error('Error copiando al portapapeles:', err);
          alert('No pudimos copiar el texto. Inténtalo manualmente.');
        });
    } else {
      // Fallback para navegadores antiguos
      alert('Copia este texto:\n\n' + caption);
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
    // Por ahora, placeholder
    alert('Gracias por querer ayudarnos a mejorar. Pronto habilitaremos un chat directo. Por ahora, escríbenos a soporte@tudominio.com 💪');
  }
}
