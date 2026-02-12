import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, throwError, interval, Subject } from 'rxjs';
import { map, catchError, switchMap, takeUntil, filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Video Express Service
 * 
 * Gestiona la interacción con los endpoints públicos de video-express
 * para el wizard de preview sin autenticación.
 * 
 * Flow:
 * 1. uploadImage() → Sube imagen y retorna imageId
 * 2. generateVideo() → Inicia generación con imageId + objetivo
 * 3. pollVideoStatus() → Polling automático hasta completar
 * 4. downloadVideo() → Descarga el video final
 * 5. submitFeedback() → Envío opcional de feedback
 */

export interface UploadImageResponse {
  success: boolean;
  imageId: string;
  previewUrl: string;
  message: string;
}

export interface GenerateVideoResponse {
  success: boolean;
  jobId: string;
  estimatedTime: number;
  message: string;
}

export interface VideoStatusResponse {
  success: boolean;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  isSimulated?: boolean; // true si es video placeholder (SIMULATION_MODE o límite alcanzado)
  limitReached?: boolean; // true si se alcanzó el límite de créditos
}

export interface FeedbackRequest {
  jobId: string;
  helpful: boolean;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
}

export interface CreditStatusResponse {
  real_videos_generated: number;
  limit: number;
  remaining: number;
  percentage_used: number;
  can_generate: boolean;
  last_reset: string | null;
  history: Array<{
    requestId: string;
    timestamp: string;
    count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class VideoExpressService {
  
  private readonly baseUrl = `${environment.API_URL}/video-express/preview`;
  private stopPolling$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  /**
   * Sube una imagen de producto
   * 
   * @param imageFile - Archivo de imagen (JPG/PNG)
   * @returns Observable con imageId y previewUrl
   */
  uploadImage(imageFile: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);

    return this.http.post<UploadImageResponse>(
      `${this.baseUrl}/upload`,
      formData
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Inicia la generación de un video
   * 
   * @param imageId - ID de la imagen subida
   * @param objective - 'organic' | 'ads'
   * @param animationStyle - 'zoom_in' | 'parallax' | 'subtle_float' (opcional, default 'parallax')
   * @returns Observable con jobId y tiempo estimado
   */
  generateVideo(
    imageId: string, 
    objective: 'organic' | 'ads',
    animationStyle: 'zoom_in' | 'parallax' | 'subtle_float' = 'parallax'
  ): Observable<GenerateVideoResponse> {
    return this.http.post<GenerateVideoResponse>(
      `${this.baseUrl}/generate`,
      { imageId, objective, animationStyle }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Verifica el estado de un video (llamada única)
   * 
   * @param jobId - ID del job de generación
   * @returns Observable con el estado actual
   */
  checkVideoStatus(jobId: string): Observable<VideoStatusResponse> {
    return this.http.get<VideoStatusResponse>(
      `${this.baseUrl}/status/${jobId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Polling automático del estado del video
   * 
   * Consulta cada 5 segundos hasta que:
   * - El video esté completado (status = 'completed')
   * - Ocurra un error (status = 'failed')
   * - Se llame stopPolling()
   * 
   * @param jobId - ID del job de generación
   * @param intervalMs - Intervalo de polling en ms (default: 5000)
   * @returns Observable que emite estados hasta completar o fallar
   */
  pollVideoStatus(jobId: string, intervalMs: number = 5000): Observable<VideoStatusResponse> {
    return interval(intervalMs).pipe(
      switchMap(() => this.checkVideoStatus(jobId)),
      takeUntil(this.stopPolling$),
      // Continuar hasta que status sea 'completed' o 'failed'
      takeUntil(
        this.checkVideoStatus(jobId).pipe(
          filter(response => 
            response.status === 'completed' || 
            response.status === 'failed'
          ),
          take(1)
        )
      )
    );
  }

  /**
   * Detiene el polling manual
   */
  stopPolling(): void {
    this.stopPolling$.next();
  }

  /**
   * Descarga el video generado
   * 
   * @param jobId - ID del job completado
   * @returns Observable con el blob del video
   */
  downloadVideo(jobId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/download/${jobId}`,
      { 
        responseType: 'blob',
        observe: 'body'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Trigger de descarga directa en el navegador
   * 
   * @param jobId - ID del job completado
   * @param filename - Nombre del archivo (opcional)
   */
  triggerDownload(jobId: string, filename?: string): void {
    this.downloadVideo(jobId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `product-video-${Date.now()}.mp4`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  /**
   * Envía feedback sobre el video generado
   * 
   * @param feedback - { jobId, helpful }
   * @returns Observable con respuesta de confirmación
   */
  submitFeedback(feedback: FeedbackRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(
      `${this.baseUrl}/feedback`,
      feedback
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Valida que un archivo sea una imagen válida
   * 
   * @param file - Archivo a validar
   * @returns true si es válido, string con error si no lo es
   */
  validateImageFile(file: File): true | string {
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      return 'Solo se permiten imágenes JPG o PNG';
    }

    if (file.size > maxSizeBytes) {
      return 'La imagen no puede superar los 10MB';
    }

    return true;
  }

  /**
   * Genera una URL de preview local para un archivo
   * 
   * @param file - Archivo de imagen
   * @returns URL de preview (usar con [src])
   */
  createImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Libera una URL de preview creada
   * 
   * @param url - URL a liberar
   */
  revokeImagePreview(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = error.error?.error || error.error?.message || error.message || errorMessage;
    }

    console.error('❌ VideoExpressService Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obtiene el estado actual del contador de créditos
   * (Solo disponible para usuarios autenticados)
   * 
   * @returns Observable con el estado del contador
   */
  getCreditStatus(): Observable<CreditStatusResponse> {
    return this.http.get<{ status: number; data: CreditStatusResponse }>(
      `${environment.API_URL}/video-express/credit-status`
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Resetea el contador de créditos
   * (Solo disponible para administradores)
   * 
   * @returns Observable con el nuevo estado del contador
   */
  resetCreditCounter(): Observable<CreditStatusResponse> {
    return this.http.post<{ status: number; message: string; data: CreditStatusResponse }>(
      `${environment.API_URL}/video-express/credit-reset`,
      {}
    ).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Reset completo del servicio (útil para "Crear otro video")
   */
  reset(): void {
    this.stopPolling();
  }
}
