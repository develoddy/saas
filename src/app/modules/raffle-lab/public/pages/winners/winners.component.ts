import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getRaffleImageUrl } from '../../../shared/utils/raffle-image-url.util';
import { EMPTY, Subject, catchError, switchMap, takeUntil } from 'rxjs';
import {
  PublicRaffleResults,
  RafflePublicApiService
} from '../../services/raffle-public-api.service';

@Component({
  selector: 'app-raffle-winners',
  templateUrl: './winners.component.html',
  styleUrls: ['./winners.component.scss']
})
export class WinnersComponent implements OnInit, OnDestroy {
  resultsData: PublicRaffleResults | null = null;
  drawName: string | null = null;
  resultsLoading = false;
  resultsError: string | null = null;

  getPrizeImageUrl(imagePath: string | null): string | null {
    return getRaffleImageUrl(imagePath);
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: RafflePublicApiService
  ) {}

  get drawId(): number | null {
    const raw = this.route.snapshot.queryParamMap.get('drawId');

    if (raw === null || !/^[1-9]\d*$/.test(raw)) {
      return null;
    }

    const id = Number(raw);
    return Number.isSafeInteger(id) ? id : null;
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      switchMap(params => {
        this.resultsData = null;
        this.drawName = null;
        this.resultsError = null;
        this.resultsLoading = false;

        const raw = params.get('drawId');

        if (raw === null) {
          this.resultsError =
            'Selecciona un sorteo para consultar sus resultados.';
          return EMPTY;
        }

        if (!/^[1-9]\d*$/.test(raw) ||
            !Number.isSafeInteger(Number(raw))) {
          this.resultsError = 'Identificador de sorteo inválido.';
          return EMPTY;
        }

        const id = Number(raw);
        this.resultsLoading = true;

        this.api.getDraws()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: response => {
              if (this.drawId !== id) return;

              if (response.success && Array.isArray(response.data)) {
                this.drawName =
                  response.data.find(draw => draw.id === id)?.name ?? null;
              }
            },
            error: () => {
              if (this.drawId === id) {
                this.drawName = null;
              }
            }
          });

        return this.api.getDrawResults(id).pipe(
          catchError(() => {
            this.resultsLoading = false;
            this.resultsError =
              'No se pudieron cargar los resultados del sorteo.';
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(response => {
      this.resultsLoading = false;

      const id = this.drawId;

      if (
        id === null ||
        !response.success ||
        response.data?.drawId !== id ||
        !Array.isArray(response.data.prizes)
      ) {
        this.resultsError =
          'No se pudieron consultar los resultados.';
        return;
      }

      this.resultsData = response.data;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
