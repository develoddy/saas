import { Component } from '@angular/core';

import { RaffleNumber, RaffleNumberStatus } from '../../models/raffle-number.model';
import { RaffleReservation, RaffleReservationStatus } from '../../models/raffle-reservation.model';
import { RaffleNumbersService } from '../../services/raffle-numbers.service';

import { Router } from '@angular/router';
import { RaffleAdminAuthService } from '../../services/raffle-admin-auth.service';
import {
  RaffleAdminApiService,
  AdminRaffleDraw,
  AdminRaffleReservation
} from '../../services/raffle-admin-api.service';

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrls: ['./management-demo.component.scss']
})
export class ManagementDemoComponent {
  activeAdminView: 'numbers' | 'participants' | 'settings' = 'numbers';

  totalNumbers: number;
  numbers: RaffleNumber[];

  draws: AdminRaffleDraw[] = [];
  selectedDrawId: number | null = null;
  newDrawName = '';
  newDrawTotalNumbers = 100;
  drawLoading = false;
  drawSaving = false;
  drawMessage: string | null = null;

  get selectedDraw(): AdminRaffleDraw | undefined {
    return this.draws.find(draw => draw.id === this.selectedDrawId);
  }

  drawActionLoading = false;

  publishSelectedDraw(): void {
    const draw = this.selectedDraw;

    if (!draw || draw.status !== 'draft' || this.drawActionLoading) {
      return;
    }

    if (!window.confirm(
      `¿Publicar el sorteo "${draw.name}" en la vista pública?`
    )) {
      return;
    }

    this.drawActionLoading = true;
    this.drawMessage = null;

    this.raffleApi.publishDraw(draw.id).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id ? response.data : item
        );

        this.drawActionLoading = false;
        this.drawMessage = 'Sorteo publicado correctamente.';
      },
      error: error => {
        this.drawActionLoading = false;
        this.drawMessage =
          error.error?.message || 'No se pudo publicar el sorteo.';
      }
    });
  }

  closeSelectedDraw(): void {
    const draw = this.selectedDraw;

    if (!draw || draw.status !== 'published' || this.drawActionLoading) {
      return;
    }

    if (!window.confirm(
      `¿Cerrar definitivamente el sorteo "${draw.name}"?`
    )) {
      return;
    }

    this.drawActionLoading = true;
    this.drawMessage = null;

    this.raffleApi.closeDraw(draw.id).subscribe({
      next: response => {
        this.draws = this.draws.map(item =>
          item.id === draw.id ? response.data : item
        );

        this.drawActionLoading = false;
        this.drawMessage = 'Sorteo cerrado correctamente.';
      },
      error: error => {
        this.drawActionLoading = false;
        this.drawMessage =
          error.error?.message || 'No se pudo cerrar el sorteo.';
      }
    });
  }

  get numberSummary(): {
    available: number;
    pending: number;
    confirmed: number;
    other: number;
  } {
    const counts = {
      available: 0,
      pending: 0,
      confirmed: 0,
      other: 0
    };

    for (const number of this.numbers) {
      if (number.status === 'available') {
        counts.available++;
      } else if (number.status === 'pending') {
        counts.pending++;
      } else if (number.status === 'confirmed') {
        counts.confirmed++;
      } else {
        counts.other++;
      }
    }

    return counts;
  }

  get participantSummary(): {
    pending: number;
    confirmed: number;
  } {
    return {
      pending: this.realReservations.filter(
        reservation => reservation.status === 'active'
      ).length,
      confirmed: this.realReservations.filter(
        reservation => reservation.status === 'confirmed'
      ).length
    };
  }

  loadDraws(): void {
    this.drawLoading = true;

    this.raffleApi.getDraws().subscribe({
      next: response => {
        this.draws = response.data;
        this.drawLoading = false;

        if (this.draws.length && this.selectedDrawId === null) {
          this.selectDraw(this.draws[0].id);
        }
      },
      error: () => {
        this.drawLoading = false;
        this.drawMessage = 'No se pudieron cargar los sorteos.';
      }
    });
  }

  selectDraw(drawId: number): void {
    const draw = this.draws.find(item => item.id === drawId);

    if (!draw) {
      return;
    }

    this.selectedDrawId = draw.id;
    this.manualSelectedNumbers = [];
    this.manualNumbersInput = '';
    this.manualInputError = null;
    this.manualMessage = null;
    this.totalNumbers = draw.totalNumbers;
    this.numbers = [];
    this.selectedNumber = null;
    this.realReservations = [];
    this.reservationMessage = null;
    this.loadReservations(draw.id);
    this.drawMessage = null;

    this.raffleApi.getDrawNumbers(draw.id).subscribe({
      next: response => {
        if (this.selectedDrawId === draw.id) {
          this.numbers = response.data.numbers;
        }
      },
      error: () => {
        if (this.selectedDrawId === draw.id) {
          this.drawMessage = 'No se pudieron cargar los números.';
        }
      }
    });
  }

  manualParticipantName = '';
  manualNumbersInput = '';
  manualInputError: string | null = null;

  addManualNumbersFromText(): void {
    this.manualInputError = null;

    const input = this.manualNumbersInput.trim();

    if (!input) {
      return;
    }

    const parts = input.split(/[\s,;]+/).filter(Boolean);

    if (parts.some(part => !/^[0-9]+$/.test(part))) {
      this.manualInputError = 'Introduce números separados por comas.';
      return;
    }

    const values = parts.map(Number);

    if (values.some(value => !Number.isSafeInteger(value))) {
      this.manualInputError = 'Hay números inválidos.';
      return;
    }

    const combined = [...this.manualSelectedNumbers, ...values];

    if (new Set(combined).size !== combined.length) {
      this.manualInputError = 'Hay números repetidos en la selección.';
      return;
    }

    const unavailable = values.filter(value =>
      !this.numbers.some(
        number => number.value === value &&
                  number.status === 'available'
      )
    );

    if (unavailable.length) {
      this.manualInputError =
        'Números no disponibles: ' + unavailable.join(', ');
      return;
    }

    this.manualSelectedNumbers = combined.sort((a, b) => a - b);
    this.manualNumbersInput = '';
  }

  removeManualNumber(value: number): void {
    this.manualSelectedNumbers =
      this.manualSelectedNumbers.filter(item => item !== value);
  }


  manualPaymentStatus: 'pending' | 'paid' = 'pending';
  manualSelectedNumbers: number[] = [];
  manualSaving = false;
  manualMessage: string | null = null;

  toggleManualNumber(value: number): void {
    const number = this.numbers.find(item => item.value === value);

    if (!number || number.status !== 'available') {
      return;
    }

    this.manualSelectedNumbers =
      this.manualSelectedNumbers.includes(value)
        ? this.manualSelectedNumbers.filter(item => item !== value)
        : [...this.manualSelectedNumbers, value].sort((a, b) => a - b);
  }

  createManualReservation(): void {
    const name = this.manualParticipantName.trim();
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.selectedDraw?.status === 'closed' ||
      !name ||
      this.manualSelectedNumbers.length === 0 ||
      this.manualSaving
    ) {
      return;
    }

    const unavailable = this.manualSelectedNumbers.filter(
      value => !this.numbers.some(
        number =>
          number.value === value &&
          number.status === 'available'
      )
    );

    if (unavailable.length) {
      this.manualMessage =
        'Estos números ya no están disponibles: ' +
        unavailable.join(', ');
      this.refreshNumbers(drawId);
      return;
    }

    this.manualSaving = true;
    this.manualMessage = null;

    this.raffleApi.createManualReservation(
      drawId,
      name,
      [...this.manualSelectedNumbers],
      this.manualPaymentStatus
    ).subscribe({
      next: () => {
        this.manualSaving = false;

        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.manualParticipantName = '';
        this.manualSelectedNumbers = [];
        this.manualNumbersInput = '';
        this.manualInputError = null;
        this.manualMessage = 'Reserva guardada correctamente.';

        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.manualSaving = false;

        if (this.selectedDrawId === drawId) {
          this.manualMessage =
            error.error?.message || 'No se pudo guardar la reserva.';
        }
      }
    });
  }

  createDraw(): void {
    const name = this.newDrawName.trim();

    if (!name || !Number.isInteger(this.newDrawTotalNumbers) ||
        this.newDrawTotalNumbers < 1 || this.drawSaving) {
      return;
    }

    this.drawSaving = true;
    this.drawMessage = null;

    this.raffleApi.createDraw(name, this.newDrawTotalNumbers).subscribe({
      next: response => {
        this.drawSaving = false;
        this.draws = [response.data, ...this.draws];
        this.newDrawName = '';
        this.selectDraw(response.data.id);
        this.drawMessage = 'Sorteo creado correctamente.';
      },
      error: () => {
        this.drawSaving = false;
        this.drawMessage = 'No se pudo crear el sorteo.';
      }
    });
  }

  selectedNumber: RaffleNumber | null = null;
  statusMessage: string | null = null;
  reservationMessage: string | null = null;

  realReservations: AdminRaffleReservation[] = [];
  reservationsLoading = false;
  reservationTotal = 0;

  get activeReservations(): AdminRaffleReservation[] {
    return this.realReservations.filter(
      reservation => reservation.status === 'active'
    );
  }

  get reservationHistory(): AdminRaffleReservation[] {
    return this.realReservations
      .filter(reservation => reservation.status !== 'active')
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
  }

  private reservationsRequestId = 0;

  loadReservations(drawId: number): void {
    const requestId = ++this.reservationsRequestId;

    this.reservationsLoading = true;
    this.realReservations = [];

    const allReservations: AdminRaffleReservation[] = [];
    const pageSize = 100;

    const loadPage = (page: number): void => {
      this.raffleApi.getReservations(drawId, page, pageSize).subscribe({
        next: response => {
          if (
            this.selectedDrawId !== drawId ||
            requestId !== this.reservationsRequestId
          ) {
            return;
          }

          const result = response.data;

          allReservations.push(...result.reservations);

          const totalPages = result.pagination.totalPages;

          if (page < totalPages) {
            loadPage(page + 1);
            return;
          }

          this.realReservations = allReservations;
          this.reservationTotal = result.pagination.total;
          this.reservationsLoading = false;
          this.historyPage = 1;
        },
        error: error => {
          if (
            this.selectedDrawId !== drawId ||
            requestId !== this.reservationsRequestId
          ) {
            return;
          }

          this.reservationsLoading = false;
          this.reservationMessage =
            error.error?.message ||
            'No se pudieron cargar todas las reservas.';
        }
      });
    };

    loadPage(1);
  }

  getReservationNumbers(
    reservation: AdminRaffleReservation
  ): string {
    return reservation.numbers
      .map(number => number.value)
      .sort((a, b) => a - b)
      .join(', ');
  }

  readonly historyPageSize = 10;

  historyFilter: RaffleReservationStatus | 'all' = 'all';
  historyPage = 1;

  get filteredReservationHistory(): AdminRaffleReservation[] {
    const history = this.reservationHistory;

    return this.historyFilter === 'all'
      ? history
      : history.filter(
          reservation => reservation.status === this.historyFilter
        );
  }

  get historyTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(
        this.filteredReservationHistory.length / this.historyPageSize
      )
    );
  }

  get paginatedReservationHistory(): AdminRaffleReservation[] {
    const page = Math.min(this.historyPage, this.historyTotalPages);
    const start = (page - 1) * this.historyPageSize;

    return this.filteredReservationHistory.slice(
      start,
      start + this.historyPageSize
    );
  }

  setHistoryFilter(
    status: RaffleReservationStatus | 'all'
  ): void {
    this.historyFilter = status;
    this.historyPage = 1;
  }

  changeHistoryPage(page: number): void {
    if (page < 1 || page > this.historyTotalPages) {
      return;
    }

    this.historyPage = page;
  }

  readonly reservationOperationsInProgress = new Set<number>();

  isReservationOperationInProgress(id: number): boolean {
    return this.reservationOperationsInProgress.has(id);
  }

  confirmActiveReservation(id: number): void {
    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.reservationOperationsInProgress.has(id)
    ) {
      return;
    }

    this.reservationOperationsInProgress.add(id);

    this.raffleApi.confirmReservation(id).subscribe({
      next: () => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.reservationMessage = 'Pago confirmado correctamente.';
        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId === drawId) {
          this.reservationMessage =
            error.error?.message || 'No se pudo confirmar el pago.';
        }
      }
    });
  }

  cancelActiveReservation(id: number): void {
    if (!window.confirm('¿Cancelar esta reserva y liberar sus números?')) {
      return;
    }

    const drawId = this.selectedDrawId;

    if (
      drawId === null ||
      this.reservationOperationsInProgress.has(id)
    ) {
      return;
    }

    this.reservationOperationsInProgress.add(id);

    this.raffleApi.cancelReservation(id).subscribe({
      next: () => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId !== drawId) {
          return;
        }

        this.reservationMessage = 'Reserva cancelada correctamente.';
        this.loadReservations(drawId);
        this.refreshNumbers(drawId);
      },
      error: error => {
        this.reservationOperationsInProgress.delete(id);
        if (this.selectedDrawId === drawId) {
          this.reservationMessage =
            error.error?.message || 'No se pudo cancelar la reserva.';
        }
      }
    });
  }

  reconcileManualSelection(): void {
    const available = new Set(
      this.numbers
        .filter(number => number.status === 'available')
        .map(number => number.value)
    );

    const removed = this.manualSelectedNumbers.filter(
      value => !available.has(value)
    );

    if (!removed.length) {
      return;
    }

    this.manualSelectedNumbers = this.manualSelectedNumbers.filter(
      value => available.has(value)
    );

    this.manualInputError =
      'Se han retirado números que ya no están disponibles: ' +
      removed.join(', ');
  }

  refreshNumbers(drawId: number): void {
    this.raffleApi.getDrawNumbers(drawId).subscribe({
      next: response => {
        if (this.selectedDrawId === drawId) {
          this.numbers = response.data.numbers;

          if (this.selectedNumber) {
            this.selectedNumber =
              this.numbers.find(
                number => number.value === this.selectedNumber?.value
              ) ?? null;
          }

          this.reconcileManualSelection();
        }
      },
      error: () => {
        if (this.selectedDrawId === drawId) {
          this.drawMessage = 'No se pudieron actualizar los números.';
        }
      }
    });
  }

  get selectedNumberReservation(): AdminRaffleReservation | undefined {
    const selected = this.selectedNumber;

    if (!selected || selected.status === 'available') {
      return undefined;
    }

    const expectedStatus =
      selected.status === 'pending' ? 'active' : 'confirmed';

    return this.realReservations.find(
      reservation =>
        reservation.status === expectedStatus &&
        reservation.numbers.some(
          reservedNumber => reservedNumber.value === selected.value
        )
    );
  }

  selectNumber(number: RaffleNumber): void {
    this.selectedNumber =
      this.selectedNumber?.value === number.value
        ? null
        : number;

    this.statusMessage = null;
  }



  get availableCount(): number {
    return this.numbers.filter(
      number => number.status === 'available'
    ).length;
  }

  get pendingCount(): number {
    return this.numbers.filter(
      number => number.status === 'pending'
    ).length;
  }

  get confirmedCount(): number {
    return this.numbers.filter(
      number => number.status === 'confirmed'
    ).length;
  }

  constructor(
    private readonly raffleNumbersService: RaffleNumbersService,
    private readonly auth: RaffleAdminAuthService,
    private readonly raffleApi: RaffleAdminApiService,
    private readonly router: Router
  ) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = [];
    this.loadDraws();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/raffle-lab/management/login']);
  }
}
