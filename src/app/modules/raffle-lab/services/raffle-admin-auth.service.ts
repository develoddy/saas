import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';

interface AdminUser {
  id?: number;
  name: string;
  email: string;
  rol: string;
}

interface AdminLoginResponse {
  USER_FRONTED: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  };
}

interface AdminSessionResponse {
  success: boolean;
  user: AdminUser;
}

@Injectable({
  providedIn: 'root'
})
export class RaffleAdminAuthService {
  private readonly tokenKey = 'raffle_lab_admin_token';

  private readonly loginUrl =
    `${environment.API_URL}/users/login_admin`;

  private readonly sessionUrl =
    `${environment.API_URL}/experiments/raffle-lab/admin/session`;

  constructor(private readonly http: HttpClient) {}

  login(
    email: string,
    password: string
  ): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(
      this.loginUrl,
      { email, password }
    ).pipe(
      tap(response => {
        const accessToken = response.USER_FRONTED?.accessToken;

        if (!accessToken) {
          throw new Error('El servidor no devolvió un access token.');
        }

        sessionStorage.setItem(this.tokenKey, accessToken);
      })
    );
  }

  validateSession(): Observable<AdminSessionResponse> {
    const token = this.getAccessToken();

    return this.http.get<AdminSessionResponse>(
      this.sessionUrl,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token || ''}`
        })
      }
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
  }
}