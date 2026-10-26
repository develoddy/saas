import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrackingService } from '../../../../../services/tracking.service';
import { getRaffleImageUrl } from '../../../shared/utils/raffle-image-url.util';
import { EMPTY, Subject, catchError, map, of, switchMap, takeUntil } from 'rxjs';
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
    private readonly api: RafflePublicApiService,
    private readonly tracking: TrackingService
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
            !Number.isSafeInteger(Number(raw)) ||
            Number(raw) > 4294967295) {
          this.resultsError = 'Identificador de sorteo inválido.';
          return EMPTY;
        }

        const id = Number(raw);
        this.resultsLoading = true;

        return this.api.getDraws().pipe(
          switchMap(response => {
            if (!response.success || !Array.isArray(response.data)) {
              throw new Error('Listado público inválido.');
            }

            const draw = response.data.find(item => item.id === id);

            if (!draw) {
              this.resultsLoading = false;
              this.resultsError = 'Sorteo no disponible.';
              return EMPTY;
            }

            this.drawName = draw.name;

            if (draw.status === 'published') {
              return of({
                drawId: id,
                resultsPublishedAt: null,
                prizes: []
              } as PublicRaffleResults);
            }

            if (draw.status !== 'closed') {
              this.resultsLoading = false;
              this.resultsError = 'Sorteo no disponible.';
              return EMPTY;
            }

            return this.api.getDrawResults(id).pipe(
              map(result => {
                if (!result.success) {
                  throw new Error('Respuesta de resultados inválida.');
                }

                return result.data;
              })
            );
          }),
          catchError(() => {
            this.resultsLoading = false;
            this.resultsError =
              'No se pudieron cargar los resultados del sorteo.';
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.resultsLoading = false;

      if (
        !results ||
        results.drawId !== this.drawId ||
        !Array.isArray(results.prizes)
      ) {
        this.resultsError =
          'No se pudieron consultar los resultados.';
        return;
      }

      this.resultsData = results;

      this.tracking.pageView('numiq_winners', {
        module: 'numiq',
        draw_id: results.drawId
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
