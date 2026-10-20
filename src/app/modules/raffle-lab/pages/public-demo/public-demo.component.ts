import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RaffleNumber } from '../../models/raffle-number.model';
import { RafflePrize } from '../../models/raffle-prize.model';
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
  prizes: RafflePrize[] = [];
  prizesLoading = false;
  prizesError: string | null = null;
  loading = true;
  numbersLoading = false;
  error: string | null = null;
  selectedNumber: number | null = null;
  @ViewChild('modalCloseButton') modalCloseButton?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;
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
            this.prizes = [];
            this.prizesLoading = false;
            this.prizesError = null;
            this.error = null;
            return;
          }
          if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
            this.selectedDraw = null;
            this.numbers = [];
            this.prizes = [];
            this.prizesLoading = false;
            this.prizesError = null;
            this.error = 'Identificador de sorteo inválido.';
            return;
          }
          const draw = this.draws.find(item => item.id === Number(raw));
          if (!draw) {
            this.selectedDraw = null;
            this.numbers = [];
            this.prizes = [];
            this.prizesLoading = false;
            this.prizesError = null;
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

  get bannerImageUrl(): string | null {
    return this.getBannerUrl(this.selectedDraw?.bannerImage);
  }

  get bannerImageMobileUrl(): string | null {
    return this.getBannerUrl(this.selectedDraw?.bannerImageMobile);
  }

  getPrizeImageUrl(imagePath: string | null): string | null {
    return this.getBannerUrl(imagePath);
  }

  private getBannerUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath || !imagePath.startsWith('/uploads/raffle-lab/')) {
      return null;
    }

    const apiUrl = environment.API_URL.endsWith('/api')
      ? environment.API_URL.slice(0, -4)
      : environment.API_URL;

    return `${apiUrl}${imagePath}`;
  }

  get whatsappUrl(): string {
    if (!this.selectedDraw || this.selectedNumber === null) return '';

    const number = String(this.selectedNumber).padStart(2, '0');
    const message = `Hola, quiero solicitar el número ${number} del sorteo ${this.selectedDraw.name}. ¿Está disponible? Entiendo que la reserva debe confirmarse.`;

    return `https://wa.me/34605974436?text=${encodeURIComponent(message)}`;
  }

  openNumberModal(number: RaffleNumber): void {
    if (this.selectedDraw?.status !== 'published' || number.status !== 'available' || this.numbersLoading) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedNumber = number.value;
    // Focus the close control once Angular has rendered the modal.
    queueMicrotask(() => this.modalCloseButton?.nativeElement.focus());
  }

  closeNumberModal(): void {
    this.selectedNumber = null;
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedNumber !== null) this.closeNumberModal();
  }

  scrollToNumbers(event: Event): void {
    event.preventDefault();

    document.getElementById('numbers-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  chooseDraw(event: Event): void {
    this.closeNumberModal();
    const id = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: id ? { drawId: id } : { drawId: null },
      queryParamsHandling: 'merge'
    });
  }

  private loadDrawPrizes(drawId: number): void {
    this.prizesLoading = true;
    this.prizesError = null;

    this.api.getDrawPrizes(drawId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (this.selectedDraw?.id !== drawId) return;

          this.prizesLoading = false;

          if (
            !response.success ||
            response.data?.drawId !== drawId ||
            !Array.isArray(response.data.prizes)
          ) {
            this.prizesError = 'No se pudieron consultar los premios.';
            return;
          }

          this.prizes = response.data.prizes
            .slice()
            .sort((a, b) => a.position - b.position);
        },
        error: () => {
          if (this.selectedDraw?.id !== drawId) return;

          this.prizesLoading = false;
          this.prizesError = 'No se pudieron cargar los premios del sorteo.';
        }
      });
  }

  private loadDraw(draw: PublicRaffleDraw): void {
    this.closeNumberModal();
    this.selectedDraw = draw;
    this.numbers = [];
    this.prizes = [];
    this.prizesError = null;
    this.loadDrawPrizes(draw.id);
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
    this.selectedNumber = null;
    this.destroy$.next();
    this.destroy$.complete();
  }
}
