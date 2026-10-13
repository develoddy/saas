import { Injectable } from '@angular/core';

import {
  RaffleNumber,
  RaffleNumberStatus
} from '../models/raffle-number.model';

@Injectable()
export class RaffleNumbersService {
  readonly totalNumbers = 100;

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

    number.status = status;
    return true;
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
