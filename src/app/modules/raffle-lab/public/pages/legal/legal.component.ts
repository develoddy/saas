import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type LegalPage = 'legal' | 'privacy' | 'cookies' | 'terms';

@Component({
  selector: 'app-raffle-legal',
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.scss']
})
export class LegalComponent implements OnInit {
  page: LegalPage = 'legal';
  drawId: number | null = null;

  readonly titles: Record<LegalPage, string> = {
    legal: 'Aviso legal',
    privacy: 'Política de privacidad',
    cookies: 'Cookies y almacenamiento',
    terms: 'Condiciones de participación'
  };

  readonly descriptions: Record<LegalPage, string> = {
    legal: 'Información sobre la titularidad y las condiciones generales de NUMIQ.',
    privacy: 'Información sobre el tratamiento de datos personales en NUMIQ.',
    cookies: 'Información sobre las tecnologías de almacenamiento utilizadas.',
    terms: 'Información sobre las reglas y responsabilidades de participación.'
  };

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    const page = this.route.snapshot.data['legalPage'];
    if (page === 'legal' || page === 'privacy' || page === 'cookies' || page === 'terms') {
      this.page = page;
    }

    this.route.queryParamMap.subscribe(params => {
      const value = params.get('drawId');
      const parsed = value !== null ? Number(value) : NaN;
      this.drawId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    });
  }
}
