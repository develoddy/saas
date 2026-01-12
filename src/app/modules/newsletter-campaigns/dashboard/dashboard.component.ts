import { Component, OnInit } from '@angular/core';
import { SaasService, TenantProfile } from '../../../core/saas.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  tenant: TenantProfile | null = null;

  constructor(private saasService: SaasService) {}

  ngOnInit(): void {
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
