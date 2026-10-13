import { Component } from '@angular/core';

import { RaffleNumber, RaffleNumberStatus } from '../../models/raffle-number.model';
import { RaffleNumbersService } from '../../services/raffle-numbers.service';

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrls: ['./management-demo.component.scss']
})
export class ManagementDemoComponent {
  readonly totalNumbers: number;
  readonly numbers: RaffleNumber[];

  selectedNumber: RaffleNumber | null = null;

  changeSelectedNumberStatus(
    status: RaffleNumberStatus
  ): void {
    if (!this.selectedNumber) {
      return;
    }

    this.raffleNumbersService.updateNumberStatus(
      this.selectedNumber.value,
      status
    );
  }

  selectNumber(number: RaffleNumber): void {
    this.selectedNumber =
      this.selectedNumber?.value === number.value
        ? null
        : number;
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

  constructor(private readonly raffleNumbersService: RaffleNumbersService) {
    this.totalNumbers = raffleNumbersService.totalNumbers;
    this.numbers = raffleNumbersService.numbers;
  }
}
