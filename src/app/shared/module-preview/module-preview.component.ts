import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { ModulePreviewService, PreviewData } from '../../services/module-preview.service';
import { TrackingService } from '../../services/tracking.service';

/**
 * Module Preview Component
 * 
 * Componente genérico que se adapta para mostrar el preview de cualquier módulo SaaS.
 * 
 * Uso:
 * <app-module-preview 
 *   [moduleKey]="'mailflow'"
 *   [previewData]="previewData"
 *   (onConvert)="handleConversion($event)">
 * </app-module-preview>
 * 
 * Este componente se usa para:
 * 1. Mostrar preview generado (emails, dashboards, etc.)
 * 2. Permitir edición antes de conversión
 * 3. Manejar el flujo de conversión post-registro
 * 
 * @module components/shared/module-preview
 */

@Component({
  selector: 'app-module-preview',
  templateUrl: './module-preview.component.html',
  styleUrls: ['./module-preview.component.scss']
})
export class ModulePreviewComponent implements OnInit {
  
  @Input() moduleKey!: string;
  @Input() previewData: PreviewData | null = null;
  @Input() isAuthenticated = false;
  @Input() showConvertButton = true;
  
  @Output() onConvert = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<any>();
  
  loading = false;
  converting = false;
  error: string | null = null;
  
  // Metadata del preview
  moduleName = '';
  generatedAt: Date | null = null;
  expiresAt: Date | null = null;
  isExpired = false;
  
  constructor(
    private previewService: ModulePreviewService,
    private router: Router,
    private tracking: TrackingService
  ) {}

  ngOnInit(): void {
    // Si no hay previewData, intentar recuperar de sessionStorage
    if (!this.previewData && this.moduleKey) {
      this.previewData = this.previewService.getPreviewFromSession(this.moduleKey);
    }
    
    if (this.previewData) {
      this.extractMetadata();
    }
  }

  /**
   * Extraer metadata del preview
   */
  private extractMetadata(): void {
    if (!this.previewData?._metadata) return;
    
    const metadata = this.previewData._metadata;
    
    this.moduleName = metadata.moduleName;
    this.generatedAt = new Date(metadata.generatedAt);
    
    // Calcular expiración (24h)
    this.expiresAt = new Date(this.generatedAt);
    this.expiresAt.setHours(this.expiresAt.getHours() + 24);
    
    // Verificar si expiró
    this.isExpired = new Date() > this.expiresAt;
  }

  /**
   * Convertir preview en configuración real
   * Se ejecuta después de que el usuario haga login
   */
  async convertToReal(): Promise<void> {
    if (!this.previewData || !this.isAuthenticated) {
      this.error = 'Please login first to save this configuration';
      return;
    }
    
    this.converting = true;
    this.error = null;
    
    try {
      const result = await this.previewService.convertPreviewToReal(
        this.moduleKey,
        this.previewData,
        true // autoActivate
      ).toPromise();
      
      console.log('✅ Preview converted successfully:', result);
      
      // Limpiar sessionStorage
      this.previewService.clearPreviewFromSession(this.moduleKey);
      
      // Emitir evento de conversión exitosa
      this.onConvert.emit(result);
      
      // Redirigir al módulo
      this.router.navigate([`/${this.moduleKey}`]);
      
    } catch (err: any) {
      console.error('❌ Error converting preview:', err);
      this.error = err.error?.error || 'Failed to convert preview';
      
    } finally {
      this.converting = false;
    }
  }

  /**
   * Editar preview antes de convertir
   */
  editPreview(): void {
    this.onEdit.emit(this.previewData);
  }

  /**
   * Redirigir a login/registro con intención de conversión
   */
  redirectToAuth(): void {
    // Track conversion intent
    this.tracking.conversionStarted(this.moduleKey, 'preview');
    
    // Guardar el preview en sessionStorage antes de redirigir
    if (this.previewData) {
      this.previewService.savePreviewToSession(this.previewData);
    }
    
    // Redirigir a registro con parámetro de retorno
    this.router.navigate(['/register'], {
      queryParams: {
        module: this.moduleKey,
        from_preview: 'true'
      }
    });
  }

  /**
   * Regenerar preview si expiró
   */
  async regeneratePreview(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      // Aquí cada módulo debería tener su propia lógica de regeneración
      // Por ahora, redirigir al wizard
      this.router.navigate([`/preview/${this.moduleKey}`]);
      
    } catch (err: any) {
      this.error = 'Failed to regenerate preview';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Obtener color del badge según estado
   */
  getStatusBadgeColor(): string {
    if (this.isExpired) return 'danger';
    if (this.converting) return 'warning';
    return 'success';
  }

  /**
   * Obtener texto del badge según estado
   */
  getStatusBadgeText(): string {
    if (this.isExpired) return 'Expired';
    if (this.converting) return 'Converting...';
    return 'Preview';
  }
}
