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
    
    // Verificar si hay token
    if (!this.saasService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Verificar acceso con el backend
    return this.saasService.checkAccess().pipe(
      map(response => {
        if (response.success && response.has_access) {
          return true;
        } else {
          this.router.navigate(['/login'], {
            queryParams: { expired: true }
          });
          return false;
        }
      }),
      catchError(error => {
        console.error('Error checking tenant access:', error);
        this.saasService.logout();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
