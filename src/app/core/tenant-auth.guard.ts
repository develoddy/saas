import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SaasService } from './saas.service';

@Injectable({
  providedIn: 'root'
})
export class TenantAuthGuard implements CanActivate {

  constructor(
    private saasService: SaasService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    
    console.log('🔐 TenantAuthGuard: Verificando acceso...');
    
    // Verificar si hay token
    if (!this.saasService.isAuthenticated()) {
      console.log('❌ No hay token, redirigiendo a login');
      // Capturar la URL completa para redirigir después del login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    console.log('✅ Token encontrado, verificando acceso con backend...');
    
    // Obtener moduleKey de la ruta o del tenant
    const moduleKey = route.paramMap.get('moduleKey') || this.saasService.getCurrentTenant()?.module_key;

    // Verificar acceso con el backend
    return this.saasService.checkAccess().pipe(
      map(response => {
        console.log('📥 Respuesta de checkAccess:', response);
        
        if (response.success && response.hasAccess) {
          console.log('✅ Acceso permitido');
          return true;
        } 
        
        // 🆕 Si el trial expiró o no tiene acceso activo, redirigir a upgrade
        if (response.tenant) {
          const tenant = response.tenant;
          const tenantModuleKey = moduleKey || tenant.module_key;
          
          // Trial expirado o status no activo → /upgrade
          if (tenant.status === 'trial' && !response.hasAccess) {
            console.log('⏰ Trial expirado, redirigiendo a /upgrade');
            this.router.navigate(['/upgrade']);
            return false;
          }
          
          // Subscripción expirada/cancelada → /upgrade
          if (['expired', 'cancelled', 'suspended'].includes(tenant.status)) {
            console.log(`❌ Status: ${tenant.status}, redirigiendo a /upgrade`);
            this.router.navigate(['/upgrade']);
            return false;
          }
        }
        
        // Otros casos → login
        console.log('❌ Acceso denegado, redirigiendo a login');
        this.router.navigate(['/login'], {
          queryParams: { expired: true }
        });
        return false;
      }),
      catchError(error => {
        console.error('❌ Error checking tenant access:', error);
        this.saasService.logout();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
