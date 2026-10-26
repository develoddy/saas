import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-raffle-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class RaffleFooterComponent {
  @Input() drawId: number | null = null;
}
