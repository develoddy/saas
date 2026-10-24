import { Component, HostListener, Input } from '@angular/core';

@Component({
  selector: 'app-raffle-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class RaffleHeaderComponent {
  @Input() showNumbersLink = false;
  @Input() drawId: number | null = null;

  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  scrollToNumbers(event: Event): void {
    event.preventDefault();
    this.closeMenu();

    document.getElementById('numbers-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
