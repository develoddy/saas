import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ModulePreviewService } from '../services/module-preview.service';

/**
 * Guard para validar que un módulo esté activo antes de permitir acceso
 * 
 * Uso:
 * {
 *   path: 'preview/productclip',
 *   component: VideoExpressWizardComponent,
 *   canActivate: [ModuleActiveGuard],
 *   data: { moduleKey: 'productclip' }
 * }
 * 
 * Si el módulo está desactivado en admin panel:
 * - Redirige a MVPs Hub con mensaje
 * - No carga el componente (no hay tracking events)
 */
@Injectable({
  providedIn: 'root'
})
export class ModuleActiveGuard implements CanActivate {
  
  // Cache de módulos activos para evitar múltiples llamadas
  private cachedModules: Map<string, boolean> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  
  constructor(
    private modulePreviewService: ModulePreviewService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const moduleKey = route.data['moduleKey'];
    
    if (!moduleKey) {
      console.warn('⚠️ ModuleActiveGuard: No moduleKey in route data');
      return of(true); // Si no hay moduleKey, permitir acceso
    }
    
    // Verificar cache
    if (this.isCacheValid() && this.cachedModules.has(moduleKey)) {
      const isActive = this.cachedModules.get(moduleKey)!;
      if (!isActive) {
        this.redirectToHub(moduleKey);
      }
      return of(isActive);
    }
    
    // Consultar backend
    return this.modulePreviewService.loadAvailableModules().pipe(
      map((response: any) => {
        if (response.success) {
          // Actualizar cache
          this.updateCache(response.modules);
          
          // Verificar si el módulo está en la lista de activos
          const isActive = response.modules.some(
            (m: any) => m.moduleKey === moduleKey
          );
          
          if (!isActive) {
            this.redirectToHub(moduleKey);
          }
          
          return isActive;
        }
        
        // Si falla la API, permitir acceso (fail-safe)
        console.warn('⚠️ ModuleActiveGuard: API response failed, allowing access');
        return true;
      }),
      catchError((error) => {
        // En caso de error de red, permitir acceso (fail-safe)
        console.error('❌ ModuleActiveGuard: Error checking module status:', error);
        console.warn('⚠️ Allowing access due to network error (fail-safe)');
        return of(true);
      })
    );
  }
  
  /**
   * Actualizar cache con módulos activos
   */
  private updateCache(modules: any[]): void {
    this.cachedModules.clear();
    modules.forEach(m => {
      this.cachedModules.set(m.moduleKey, true);
    });
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }
  
  /**
   * Verificar si el cache es válido
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }
  
  /**
   * Redirigir a MVPs Hub con mensaje
   */
  private redirectToHub(moduleKey: string): void {
    console.log(`🚫 Module "${moduleKey}" is not active. Redirecting to hub.`);
    this.router.navigate(['/'], {
      queryParams: {
        message: 'This module is currently unavailable'
      }
    });
  }
}
