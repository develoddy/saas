from pathlib import Path
import sys

root = Path.cwd()
base = root / 'src/app/modules/raffle-lab'
component = base / 'pages/public-demo/public-demo.component.ts'
template = base / 'pages/public-demo/public-demo.component.html'
management = base / 'pages/management-demo/management-demo.component.html'
service = base / 'services/raffle-public-api.service.ts'
for file in (component, template, management, service):
    if not file.is_file():
        sys.exit(f'ERROR: no existe {file}. Ejecuta desde app-saas y comprueba que el servicio público esté creado.')
old = management.read_text()
needle = 'routerLink="/raffle-lab"'
if old.count(needle) != 1:
    sys.exit('ERROR: no se encontró un único enlace público en administración. No se modificó ningún archivo.')

new_ts = '''import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RaffleNumber } from '../../models/raffle-number.model';
import {
  PublicRaffleDraw,
  RafflePublicApiService
} from '../../services/raffle-public-api.service';

@Component({
  selector: 'app-public-demo',
  templateUrl: './public-demo.component.html',
  styleUrls: ['./public-demo.component.scss']
})
export class PublicDemoComponent implements OnInit, OnDestroy {
  draws: PublicRaffleDraw[] = [];
  selectedDraw: PublicRaffleDraw | null = null;
  numbers: RaffleNumber[] = [];
  loading = true;
  numbersLoading = false;
  error: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly api: RafflePublicApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.api.getDraws().pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.loading = false;
        if (!response.success || !Array.isArray(response.data)) {
          this.error = 'No se pudieron consultar los sorteos.';
          return;
        }
        this.draws = response.data;
        this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
          const raw = params.get('drawId');
          if (raw === null) {
            this.selectedDraw = null;
            this.numbers = [];
            this.error = null;
            return;
          }
          if (!/^[1-9]\\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
            this.selectedDraw = null;
            this.numbers = [];
            this.error = 'Identificador de sorteo inválido.';
            return;
          }
          const draw = this.draws.find(item => item.id === Number(raw));
          if (!draw) {
            this.selectedDraw = null;
            this.numbers = [];
            this.error = 'El sorteo solicitado no está disponible públicamente.';
            return;
          }
          this.loadDraw(draw);
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los sorteos. Inténtalo más tarde.';
      }
    });
  }

  chooseDraw(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: id ? { drawId: id } : { drawId: null },
      queryParamsHandling: 'merge'
    });
  }

  private loadDraw(draw: PublicRaffleDraw): void {
    this.selectedDraw = draw;
    this.numbers = [];
    this.error = null;
    this.numbersLoading = true;
    this.api.getDrawNumbers(draw.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (this.selectedDraw?.id !== draw.id) return;
        this.numbersLoading = false;
        if (!response.success || response.data?.drawId !== draw.id || !Array.isArray(response.data.numbers)) {
          this.error = 'No se pudieron consultar los números.';
          return;
        }
        this.numbers = response.data.numbers;
      },
      error: () => {
        if (this.selectedDraw?.id !== draw.id) return;
        this.numbersLoading = false;
        this.error = 'No se pudieron cargar los números del sorteo.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
'''
new_html = '''<div class="raffle-lab">
  <header class="raffle-header">
    <div class="raffle-brand">
      <span class="brand-icon" aria-hidden="true">🎁</span>
      <div class="brand-info">
        <span class="brand-name">Raffle <strong>Lab</strong></span>
        <span class="brand-subtitle">Parro Sorteos · Vista pública</span>
      </div>
    </div>
    <div class="raffle-header-actions">
      <a class="raffle-management-link" routerLink="/raffle-lab/management">Ir a gestión →</a>
      <span class="demo-badge">LAB</span>
    </div>
  </header>

  <main class="raffle-content">
    <section class="raffle-hero">
      <span class="section-badge">SORTEOS PÚBLICOS</span>
      <h1>La suerte tiene un número.</h1>
      <p class="raffle-description">Consulta la disponibilidad real de cada sorteo.</p>
    </section>

    <p *ngIf="loading" role="status">Cargando sorteos…</p>
    <p *ngIf="error" class="reservation-error" role="alert">{{ error }}</p>
    <p *ngIf="!loading && !error && draws.length === 0">No hay sorteos públicos disponibles.</p>

    <section *ngIf="!loading && draws.length > 0" class="raffle-numbers" aria-labelledby="numbers-title">
      <div class="numbers-heading">
        <div>
          <span class="prize-label">SORTEO</span>
          <h2 id="numbers-title">Consulta los números</h2>
          <label for="public-draw">Selecciona un sorteo</label>
          <select id="public-draw" [value]="selectedDraw?.id || ''" (change)="chooseDraw($event)">
            <option value="">Seleccionar sorteo…</option>
            <option *ngFor="let draw of draws" [value]="draw.id">
              {{ draw.name }} ({{ draw.status === 'closed' ? 'cerrado' : 'publicado' }})
            </option>
          </select>
        </div>
      </div>

      <ng-container *ngIf="selectedDraw as draw">
        <div class="raffle-meta">
          <span>{{ draw.name }}</span>
          <span>🎟️ {{ draw.totalNumbers }} números</span>
          <span>{{ draw.status === 'closed' ? 'Sorteo cerrado' : 'Sorteo publicado' }}</span>
        </div>
        <p *ngIf="numbersLoading" role="status">Cargando números…</p>
        <div *ngIf="!numbersLoading && !error" class="numbers-grid">
          <button
            *ngFor="let number of numbers"
            type="button"
            class="number-cell"
            [class.is-available]="number.status === 'available'"
            [class.is-pending]="number.status === 'pending'"
            [class.is-confirmed]="number.status === 'confirmed'"
            [disabled]="true"
            [attr.aria-label]="'Número ' + number.value + ', ' + number.status"
          >{{ number.value | number:'2.0-0' }}</button>
        </div>
        <div *ngIf="!numbersLoading && !error" class="numbers-legend">
          <span><i class="legend-dot available"></i> Disponible</span>
          <span><i class="legend-dot pending"></i> Pendiente</span>
          <span><i class="legend-dot confirmed"></i> Confirmado</span>
        </div>
      </ng-container>
    </section>

    <section class="demo-notice">
      <p>Vista de consulta conectada a los datos del sorteo. Las reservas públicas aún no están habilitadas en esta interfaz.</p>
    </section>
  </main>
</div>
'''

# Guardar copias originales para reversión local.
for file in (component, template, management):
    backup = file.with_name(file.name + '.before-public-api.bak')
    if backup.exists():
        sys.exit(f'ERROR: ya existe copia de seguridad: {backup}. No se modificó ningún archivo.')
for file in (component, template, management):
    file.with_name(file.name + '.before-public-api.bak').write_bytes(file.read_bytes())
component.write_text(new_ts)
template.write_text(new_html)
management.write_text(old.replace(needle, needle + '\n        [queryParams]="selectedDraw ? { drawId: selectedDraw.id } : {}"'))
print('OK: actualizados componente, plantilla y enlace de administración.')
print('Copias .before-public-api.bak creadas junto a los archivos originales.')
