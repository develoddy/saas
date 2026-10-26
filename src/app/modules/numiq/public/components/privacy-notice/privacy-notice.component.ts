import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-raffle-privacy-notice',
  templateUrl: './privacy-notice.component.html',
  styleUrls: ['./privacy-notice.component.scss']
})
export class RafflePrivacyNoticeComponent implements OnInit {
  @Input() drawId: number | null = null;

  visible = false;

  private readonly storageKey = 'numiq_privacy_notice_acknowledged';

  ngOnInit(): void {
    try {
      this.visible = sessionStorage.getItem(this.storageKey) !== '1';
    } catch {
      // Si el almacenamiento no está disponible, el aviso sigue visible.
      this.visible = true;
    }
  }

  acknowledge(): void {
    try {
      sessionStorage.setItem(this.storageKey, '1');
    } catch {
      // El cierre funciona aunque el navegador bloquee el almacenamiento.
    }

    this.visible = false;
  }
}
