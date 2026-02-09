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
  
  // Feedback & Tracking
  videoCompletedAt: Date | null; // Timestamp cuando se completó el video
  downloadedAt: Date | null; // Timestamp cuando el usuario descargó
  feedbackSubmitted: boolean;
  feedbackHelpful: boolean | null; // true = helpful, false = not helpful
  feedbackMessage: string | null; // Mensaje personalizado post-feedback
  
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
    videoCompletedAt: null,
    downloadedAt: null,
    feedbackSubmitted: false,
    feedbackHelpful: null,
    feedbackMessage: null,
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
            
            // 📅 Guardar timestamp de completado (para calcular tiempo hasta feedback)
            this.state.videoCompletedAt = new Date();
            
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
   * Descarga el video generado
   */
  downloadVideo(): void {
    if (!this.state.jobId || this.isDownloading) return;
    
    this.isDownloading = true;
    
    // Track download
    this.trackEvent('video_express_video_downloaded', {
      jobId: this.state.jobId
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
      feedbackWasPositive: this.state.feedbackHelpful
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
      videoCompletedAt: null,
      downloadedAt: null,
      feedbackSubmitted: false,
      feedbackHelpful: null,
      feedbackMessage: null,
      error: null,
      loading: false
    };
    
    this.currentMessageIndex = 0;
  }

  /**
   * Envía feedback sobre el video con experiencia mejorada
   */
  submitFeedback(helpful: boolean): void {
    if (!this.state.jobId || this.state.feedbackSubmitted) return;
    
    // Calcular tiempo desde descarga (si aplica)
    const downloadTime = this.state.downloadedAt 
      ? Date.now() - this.state.downloadedAt.getTime()
      : null;
    
    // Calcular tiempo desde que el video se completó
    const timeToFeedback = this.state.videoCompletedAt
      ? Date.now() - this.state.videoCompletedAt.getTime()
      : null;
    
    // Actualizar estado inmediatamente para feedback visual
    this.state.feedbackSubmitted = true;
    this.state.feedbackHelpful = helpful;
    
    // Mensaje personalizado según feedback
    if (helpful) {
      this.state.feedbackMessage = '¡Gracias por tu feedback!';
    } else {
      this.state.feedbackMessage = 'Gracias por tu feedback. Lo usaremos para mejorar';
    }
    
    // Enviar feedback al backend
    this.videoExpressService.submitFeedback({
      jobId: this.state.jobId,
      helpful
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Track feedback básico (evento existente)
          this.trackingService.track('module_preview_feedback', {
            module: this.moduleKey,
            moduleName: this.moduleName,
            jobId: this.state.jobId,
            helpful,
            objective: this.state.selectedObjective
          });
          
          // 🎯 NUEVO: Track avanzado post-download con métricas
          this.trackingService.track('feedback_post_download', {
            module: this.moduleKey,
            moduleName: this.moduleName,
            jobId: this.state.jobId,
            helpful,
            objective: this.state.selectedObjective,
            animation: this.state.selectedAnimation,
            downloadTime_ms: downloadTime,
            timeToFeedback_ms: timeToFeedback,
            wasDownloaded: !!this.state.downloadedAt,
            step: 4
          });
          
          console.log(`✅ Feedback enviado: ${helpful ? 'Positivo' : 'Negativo'}`);
        },
        error: (error) => {
          console.error('❌ Error enviando feedback:', error);
          // No resetear el estado aunque falle, mantener la UI
        }
      });
  }

  // ==========================================
  // Navigation & Helpers
  // ==========================================

  /**
   * Navega a un paso específico
   */
  private goToStep(step: 1 | 2 | 3 | 4): void {
    this.state.currentStep = step;
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
      feedbackWasPositive: this.state.feedbackHelpful
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
