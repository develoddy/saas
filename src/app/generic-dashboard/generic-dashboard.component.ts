import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SaasService, TenantProfile } from '../core/saas.service';

@Component({
  selector: 'app-generic-dashboard',
  templateUrl: './generic-dashboard.component.html',
  styleUrls: ['./generic-dashboard.component.scss']
})
export class GenericDashboardComponent implements OnInit {
  tenant: TenantProfile | null = null;
  moduleKey: string = '';

  constructor(
    private saasService: SaasService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener module_key de la ruta
    this.route.params.subscribe(params => {
      this.moduleKey = params['moduleKey'];
    });

    // Suscribirse al tenant actual
    this.saasService.currentTenant$.subscribe(tenant => {
      this.tenant = tenant;
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
