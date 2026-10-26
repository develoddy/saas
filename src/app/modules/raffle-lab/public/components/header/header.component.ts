import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'app-raffle-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class RaffleHeaderComponent {
  @Input() showNumbersLink = false;
  @Input() drawId: number | null = null;

  @ViewChild('menuToggle') menuToggle?: ElementRef<HTMLButtonElement>;

  menuOpen = false;
  isCompact = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollY = window.scrollY;

    if (!this.isCompact && scrollY > 160) {
      this.isCompact = true;
    } else if (this.isCompact && scrollY < 40) {
      this.isCompact = false;
    }
  }


  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.menuOpen) return;

    this.closeMenu();
    this.menuToggle?.nativeElement.focus();
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
