import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SaasService } from '../core/saas.service';
import { environment } from '../../environments/environment';
import { LabService, LabExperiment } from '../services/lab.service';

@Component({
  selector: 'app-mvps-hub',
  templateUrl: './mvps-hub.component.html',
  styleUrls: ['./mvps-hub.component.scss']
})
export class MvpsHubComponent implements OnInit, OnDestroy {
  
  isAuthenticated = false;
  currentTenant: any = null;
  labExperiments: LabExperiment[] = [];
  isLabLoading = false;
  labError = '';
  
  
  

  // Mobile menu state
  isMobileMenuOpen = false;

  constructor(
    private router: Router,
    private saasService: SaasService,
    private labService: LabService
  ) {}

  ngOnInit(): void {
    
    // Check if user is already authenticated
    this.isAuthenticated = this.saasService.isAuthenticated();
    
    if (this.isAuthenticated) {
      this.currentTenant = this.saasService.getCurrentTenant();
    }

    // Load published Lab experiments
    this.loadLabExperiments();

    
  }

  /**
   * Cargar experimentos publicados desde Admin.
   * Independiente de las métricas de Analytics.
   */
  loadLabExperiments(): void {
    this.isLabLoading = true;
    this.labError = '';

    this.labService.getExperiments().subscribe({
      next: (response) => {
        this.labExperiments = response.success ? response.experiments : [];
        if (!response.success) {
          this.labError = 'No se pudieron cargar los experimentos';
        }
        this.isLabLoading = false;
      },
      error: (err) => {
        console.error('Error loading Lab experiments:', err);
        this.labExperiments = [];
        this.labError = 'Error al conectar con el catálogo de Lab';
        this.isLabLoading = false;
      }
    });
  }

  /**
   * Ir a login
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Ir a registro
   */
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Ir al dashboard del usuario autenticado
   */
  goToDashboard(): void {
    if (this.currentTenant?.module_key) {
      this.router.navigate([`/${this.currentTenant.module_key}`]);
    }
  }
  
  /**
   * Mobile Menu - Toggle open/close
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Lock/unlock body scroll
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Mobile Menu - Close menu
   */
  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  /**
   * Mobile Menu - Scroll to section by ID
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy(): void {
    // Always restore body scroll when component is destroyed
    document.body.style.overflow = '';
  }
}
