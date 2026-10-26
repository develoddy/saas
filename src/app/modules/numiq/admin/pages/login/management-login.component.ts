import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RaffleAdminAuthService } from '../../services/raffle-admin-auth.service';

@Component({
  selector: 'app-management-login',
  templateUrl: './management-login.component.html',
  styleUrls: ['./management-login.component.scss']
})
export class ManagementLoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private readonly auth: RaffleAdminAuthService,
    private readonly router: Router
  ) {}

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = null;

    const email = this.email.trim();

    if (!email || !this.password) {
      this.errorMessage = 'Introduce tu email y contraseña.';
      return;
    }

    this.loading = true;

    this.auth.login(email, this.password)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: () => {
          this.password = '';
          this.router.navigate(['/numiq/management']);
        },
        error: () => {
          this.password = '';
          this.errorMessage =
            'No se ha podido iniciar sesión. Comprueba tus credenciales.';
        }
      });
  }
}