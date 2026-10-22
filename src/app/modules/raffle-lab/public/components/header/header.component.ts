import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-raffle-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class RaffleHeaderComponent {
  @Input() showNumbersLink = false;
  @Input() drawId: number | null = null;

  scrollToNumbers(event: Event): void {
    event.preventDefault();

    document.getElementById('numbers-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
