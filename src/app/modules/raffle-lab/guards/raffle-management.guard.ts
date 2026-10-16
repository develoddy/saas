import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { RaffleAdminAuthService } from '../services/raffle-admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class RaffleManagementGuard implements CanActivate {

  constructor(
    private readonly auth: RaffleAdminAuthService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | UrlTree {
    const loginUrl = this.router.createUrlTree([
      '/raffle-lab/management/login'
    ]);

    if (!this.auth.getAccessToken()) {
      return loginUrl;
    }

    return this.auth.validateSession().pipe(
      map(response => {
        if (response.success && response.user) {
          return true;
        }

        this.auth.logout();
        return loginUrl;
      }),
      catchError(() => {
        this.auth.logout();
        return of(loginUrl);
      })
    );
  }
}