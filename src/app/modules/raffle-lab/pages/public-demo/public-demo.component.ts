
import { Component } from '@angular/core';

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
export class PublicDemoComponent {
  readonly totalNumbers: number;
  readonly numbers: RaffleNumber[];

  constructor(private readonly raffleNumbersService: RaffleNumbersService) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = raffleNumbersService.numbers;
  }

  readonly selectedNumbers = new Set<number>();

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
