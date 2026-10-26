import { Injectable } from '@angular/core';

import {
  RaffleNumber,
  RaffleNumberStatus
} from '../models/raffle-number.model';

import {
  RaffleReservation
} from '../models/raffle-reservation.model';

@Injectable()
export class RaffleNumbersService {
  readonly totalNumbers = 100;

  private readonly reservations: RaffleReservation[] = [];
  private nextReservationId = 1;

  readonly numbers: RaffleNumber[] = Array.from(
    { length: this.totalNumbers },
    (_, index): RaffleNumber => {
      const value = index + 1;

      return {
        value,
        status: this.getInitialStatus(value)
      };
    }
  );

  updateNumberStatus(
    value: number,
    status: RaffleNumberStatus
  ): boolean {
    const validStatuses: RaffleNumberStatus[] = [
      'available',
      'pending',
      'confirmed'
    ];

    if (!validStatuses.includes(status)) {
      return false;
    }

    const number = this.numbers.find(
      item => item.value === value
    );

    if (!number) {
      return false;
    }

    this.expireReservations();

    const hasActiveReservation = this.reservations.some(
      reservation =>
        reservation.status === 'active' &&
        reservation.numbers.includes(value)
    );

    if (hasActiveReservation) {
      return false;
    }

    number.status = status;
    return true;
  }

  createReservation(
    participantName: string,
    values: number[],
    durationMinutes = 15
  ): RaffleReservation | null {
    const name = participantName?.trim();

    if (
      !name ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0 ||
      !Array.isArray(values)
    ) {
      return null;
    }

    this.expireReservations();

    if (!this.areNumbersAvailable(values)) {
      return null;
    }

    const now = this.now();

    const reservation: RaffleReservation = {
      id: `reservation-${this.nextReservationId++}`,
      participantName: name,
      numbers: [...values],
      status: 'active',
      createdAt: now,
      expiresAt: new Date(
        now.getTime() + durationMinutes * 60 * 1000
      )
    };

    this.reservations.push(reservation);

    for (const value of values) {
      const number = this.numbers.find(
        item => item.value === value
      );

      if (number) {
        number.status = 'pending';
      }
    }

    return {
      ...reservation,
      numbers: [...reservation.numbers],
      createdAt: new Date(reservation.createdAt),
      expiresAt: new Date(reservation.expiresAt)
    };
  }

  getReservations(): RaffleReservation[] {
    this.expireReservations();

    return this.reservations.map(reservation => ({
      ...reservation,
      numbers: [...reservation.numbers],
      createdAt: new Date(reservation.createdAt),
      expiresAt: new Date(reservation.expiresAt)
    }));
  }

  confirmReservation(id: string): boolean {
    const reservation = this.reservations.find(
      item => item.id === id
    );

    if (
      !reservation ||
      !this.isReservationActive(reservation)
    ) {
      return false;
    }

    const reservedNumbers = reservation.numbers.map(
      value => this.numbers.find(
        number => number.value === value
      )
    );

    if (
      reservedNumbers.some(
        number => !number || number.status !== 'pending'
      )
    ) {
      return false;
    }

    for (const number of reservedNumbers) {
      if (number) {
        number.status = 'confirmed';
      }
    }

    reservation.status = 'confirmed';

    return true;
  }

  cancelReservation(id: string): boolean {
    const reservation = this.reservations.find(
      item => item.id === id
    );

    if (
      !reservation ||
      !this.isReservationActive(reservation)
    ) {
      return false;
    }

    const reservedNumbers = reservation.numbers.map(
      value => this.numbers.find(
        number => number.value === value
      )
    );

    if (
      reservedNumbers.some(
        number => !number || number.status !== 'pending'
      )
    ) {
      return false;
    }

    for (const number of reservedNumbers) {
      if (number) {
        number.status = 'available';
      }
    }

    reservation.status = 'cancelled';

    return true;
  }

  expireReservations(): number {
    const now = this.now();
    let expiredCount = 0;

    for (const reservation of this.reservations) {
      if (
        reservation.status !== 'active' ||
        reservation.expiresAt.getTime() > now.getTime()
      ) {
        continue;
      }

      const reservedNumbers = reservation.numbers.map(
        value => this.numbers.find(
          number => number.value === value
        )
      );

      if (
        reservedNumbers.some(
          number => !number || number.status !== 'pending'
        )
      ) {
        continue;
      }

      for (const number of reservedNumbers) {
        if (number) {
          number.status = 'available';
        }
      }

      reservation.status = 'expired';
      expiredCount++;
    }

    return expiredCount;
  }

  private now(): Date {
    return new Date();
  }

  private isReservationActive(
    reservation: RaffleReservation,
    now: Date = this.now()
  ): boolean {
    return (
      reservation.status === 'active' &&
      reservation.expiresAt.getTime() > now.getTime()
    );
  }

  private areNumbersAvailable(values: number[]): boolean {
    if (!values.length) {
      return false;
    }

    if (new Set(values).size !== values.length) {
      return false;
    }

    return values.every(value =>
      this.numbers.some(
        number =>
          number.value === value &&
          number.status === 'available'
      )
    );
  }

  private getInitialStatus(value: number): RaffleNumberStatus {
    // Datos ficticios y deterministas del prototipo.
    if ([7, 18, 42, 73, 91].includes(value)) {
      return 'confirmed';
    }

    if ([12, 29, 56, 84].includes(value)) {
      return 'pending';
    }

    return 'available';
  }
}
