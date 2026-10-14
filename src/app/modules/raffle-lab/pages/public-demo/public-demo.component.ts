
import { Component, OnDestroy } from '@angular/core';

import { RaffleReservation } from '../../models/raffle-reservation.model';

import {
  RaffleNumber
} from '../../models/raffle-number.model';
import {
  RaffleNumbersService
} from '../../services/raffle-numbers.service';

@Component({
  selector: 'app-public-demo',
  templateUrl: './public-demo.component.html',
  styleUrls: ['./public-demo.component.scss']
})
export class PublicDemoComponent implements OnDestroy {
  readonly totalNumbers: number;
  readonly numbers: RaffleNumber[];

  constructor(private readonly raffleNumbersService: RaffleNumbersService) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = raffleNumbersService.numbers;
  }

  readonly selectedNumbers = new Set<number>();

  participantName = '';
  activeReservation: RaffleReservation | null = null;
  reservationError: string | null = null;
  remainingSeconds = 0;
  reservationExpired = false;

  private reservationTimer: ReturnType<typeof setInterval> | null = null;

  get formattedRemainingTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  cancelActiveReservation(): void {
    if (!this.activeReservation || this.reservationExpired) {
      return;
    }

    const cancelled = this.raffleNumbersService.cancelReservation(
      this.activeReservation.id
    );

    if (!cancelled) {
      this.reservationError =
        'No se ha podido cancelar la reserva.';
      return;
    }

    this.stopReservationTimer();
    this.remainingSeconds = 0;
    this.activeReservation = {
      ...this.activeReservation,
      status: 'cancelled'
    };
    this.reservationError = null;
  }

  private updateReservationTimer(): void {
    if (!this.activeReservation) {
      this.stopReservationTimer();
      return;
    }

    const remainingMilliseconds =
      this.activeReservation.expiresAt.getTime() - Date.now();

    this.remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMilliseconds / 1000)
    );

    if (this.remainingSeconds === 0) {
      this.raffleNumbersService.expireReservations();
      this.reservationExpired = true;
      this.stopReservationTimer();
    }
  }

  private startReservationTimer(): void {
    this.stopReservationTimer();
    this.reservationExpired = false;

    this.updateReservationTimer();

    if (this.remainingSeconds > 0) {
      this.reservationTimer = setInterval(
        () => this.updateReservationTimer(),
        1000
      );
    }
  }

  private stopReservationTimer(): void {
    if (this.reservationTimer !== null) {
      clearInterval(this.reservationTimer);
      this.reservationTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopReservationTimer();
  }

  reserveSelectedNumbers(): void {
    this.reservationError = null;

    const name = this.participantName.trim();
    const numbers = this.sortedSelectedNumbers;

    if (!name || numbers.length === 0) {
      this.reservationError =
        'Introduce tu nombre y selecciona al menos un número.';
      return;
    }

    const reservation = this.raffleNumbersService.createReservation(
      name,
      numbers
    );

    if (!reservation) {
      this.reservationError =
        'No se ha podido crear la reserva. Revisa la disponibilidad.';
      return;
    }

    this.activeReservation = reservation;
    this.selectedNumbers.clear();
    this.participantName = '';
    this.startReservationTimer();
  }

  get sortedSelectedNumbers(): number[] {
    return this.numbers
      .filter(number =>
        number.status === 'available' &&
        this.selectedNumbers.has(number.value)
      )
      .map(number => number.value)
      .sort((a, b) => a - b);
  }

  get selectedNumbersCount(): number {
    return this.sortedSelectedNumbers.length;
  }

  toggleNumberSelection(number: RaffleNumber): void {
    if (number.status !== 'available') {
      return;
    }

    if (this.selectedNumbers.has(number.value)) {
      this.selectedNumbers.delete(number.value);
    } else {
      this.selectedNumbers.add(number.value);
    }
  }

  isNumberSelected(value: number): boolean {
    return this.selectedNumbers.has(value);
  }

}
