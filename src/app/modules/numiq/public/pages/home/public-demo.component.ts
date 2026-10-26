import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { getRaffleImageUrl } from '../../../shared/utils/raffle-image-url.util';
import { ActivatedRoute, Router } from '@angular/router';
import { TrackingService } from '../../../../../services/tracking.service';
import { Subject, takeUntil } from 'rxjs';
import { RaffleNumber } from '../../../shared/models/raffle-number.model';
import { RafflePrize } from '../../../shared/models/raffle-prize.model';
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
  winningNumbers = new Set<number>();
  resultsPublished = false;
  prizes: RafflePrize[] = [];
  prizesLoading = false;
  prizesError: string | null = null;
  loading = true;
  numbersLoading = false;
  error: string | null = null;
  selectedNumber: number | null = null;
  @ViewChild('modalCloseButton') modalCloseButton?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly api: RafflePublicApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly tracking: TrackingService
  ) {}

  get isDirectDrawView(): boolean {
    return this.route.snapshot.queryParamMap.has('drawId');
  }

  get isUnavailableDirectDraw(): boolean {
    return this.isDirectDrawView &&
      !this.loading &&
      !this.selectedDraw &&
      !!this.error;
  }

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
    return getRaffleImageUrl(imagePath);
  }

  get whatsappUrl(): string {
    if (!this.selectedDraw || this.selectedNumber === null) return '';

    const number = String(this.selectedNumber).padStart(2, '0');
    const message = `Hola, quiero solicitar el número ${number} del sorteo ${this.selectedDraw.name}. ¿Está disponible? Entiendo que la reserva debe confirmarse.`;

    return `https://wa.me/34605974436?text=${encodeURIComponent(message)}`;
  }

  openNumberModal(number: RaffleNumber): void {
    if (this.selectedDraw?.status !== 'published' || number.status !== 'available' || this.numbersLoading) return;

    this.previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this.selectedNumber = number.value;

    this.tracking.landingEngagement(
      'numiq',
      'numiq_number_selected',
      {
        draw_id: this.selectedDraw.id,
        number_value: number.value
      }
    );

    // Focus the close control once Angular has rendered the modal.
    queueMicrotask(() => {
      if (this.selectedNumber !== null) {
        this.modalCloseButton?.nativeElement.focus();
      }
    });
  }

  trackWhatsappClick(): void {
    if (!this.selectedDraw || this.selectedNumber === null) return;

    this.tracking.landingEngagement(
      'numiq',
      'numiq_whatsapp_clicked',
      {
        draw_id: this.selectedDraw.id,
        number_value: this.selectedNumber
      }
    );
  }

  closeNumberModal(): void {
    if (this.selectedNumber === null) return;

    this.selectedNumber = null;

    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }

    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedNumber !== null) this.closeNumberModal();
  }

  @HostListener('document:keydown.tab', ['$event'])
  onModalTab(event: KeyboardEvent): void {
    if (this.selectedNumber === null) return;

    const closeButton = this.modalCloseButton?.nativeElement;
    const modal = closeButton?.closest('.raffle-number-modal');

    if (!modal) return;

    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => element.getClientRects().length > 0);

    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!modal.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
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

  private loadPublishedResults(drawId: number): void {
    this.api.getDrawResults(drawId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (
            this.selectedDraw?.id !== drawId ||
            this.selectedDraw.status !== 'closed'
          ) return;

          if (
            !response.success ||
            response.data?.drawId !== drawId ||
            !response.data.resultsPublishedAt ||
            !Array.isArray(response.data.prizes)
          ) return;

          this.winningNumbers = new Set(
            response.data.prizes
              .map(prize => prize.result?.numberValue)
              .filter((value): value is number =>
                typeof value === 'number' && Number.isSafeInteger(value)
              )
          );
          this.resultsPublished = true;
        },
        error: () => {
          // Sin resultados verificados, no destacar ganadores.
        }
      });
  }

  private loadDraw(draw: PublicRaffleDraw): void {
    this.closeNumberModal();
    this.selectedDraw = draw;

    this.tracking.landingView('numiq', {
      draw_id: draw.id,
      draw_status: draw.status
    });
    this.numbers = [];
    this.winningNumbers = new Set<number>();
    this.resultsPublished = false;
    this.prizes = [];

    if (draw.status === 'closed') {
      this.loadPublishedResults(draw.id);
    }
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
    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }

    this.selectedNumber = null;
    this.destroy$.next();
    this.destroy$.complete();
  }
}
