import { Component } from '@angular/core';

import { RaffleNumber, RaffleNumberStatus } from '../../models/raffle-number.model';
import { RaffleReservation, RaffleReservationStatus } from '../../models/raffle-reservation.model';
import { RaffleNumbersService } from '../../services/raffle-numbers.service';

import { Router } from '@angular/router';
import { RaffleAdminAuthService } from '../../services/raffle-admin-auth.service';

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrls: ['./management-demo.component.scss']
})
export class ManagementDemoComponent {
  readonly totalNumbers: number;
  readonly numbers: RaffleNumber[];

  selectedNumber: RaffleNumber | null = null;
  statusMessage: string | null = null;
  reservationMessage: string | null = null;

  get activeReservations(): RaffleReservation[] {
    return this.raffleNumbersService.getReservations().filter(
      reservation => reservation.status === 'active'
    );
  }

  get reservationHistory(): RaffleReservation[] {
    return this.raffleNumbersService.getReservations()
      .filter(reservation => reservation.status !== 'active')
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime()
      );
  }

  readonly historyPageSize = 10;

  historyFilter: RaffleReservationStatus | 'all' = 'all';
  historyPage = 1;

  get filteredReservationHistory(): RaffleReservation[] {
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

  get paginatedReservationHistory(): RaffleReservation[] {
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

  confirmActiveReservation(id: string): void {
    const confirmed = this.raffleNumbersService.confirmReservation(id);

    this.reservationMessage = confirmed
      ? 'Reserva confirmada correctamente.'
      : 'No se ha podido confirmar la reserva. Puede haber caducado.';
  }

  changeSelectedNumberStatus(
    status: RaffleNumberStatus
  ): void {
    if (!this.selectedNumber) {
      return;
    }

    const updated = this.raffleNumbersService.updateNumberStatus(
      this.selectedNumber.value,
      status
    );

    this.statusMessage = updated
      ? null
      : 'No se puede modificar este número mientras tenga una reserva activa.';
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
    private readonly router: Router
  ) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = raffleNumbersService.numbers;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/raffle-lab/management/login']);
  }
}
