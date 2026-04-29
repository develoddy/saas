import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TrackingService } from '@shared/../services/tracking.service';
import { MODULE_KEYS } from '@config/module-keys';
import { environment } from 'src/environments/environment';

// Declarar YouTube API para TypeScript
declare var YT: any;

/**
 * Prevention Demo Component
 * 
 * Validation landing page for Inbox Zero Prevention
 * Phase 0: Landing - Validates demand and pain points
 * 
 * Objective: Validate "ticket prevention" message before building SaaS
 * 
 * Content:
 * - Visual comparison: Without Inbox Zero vs With Inbox Zero
 * - Real metrics from production system
 * - CTA: Join waitlist / Early access
 * 
 * @author LujanDev
 * @module mvps/inbox-zero-prevention/landing
 * @date 2026-02-24
 */

interface RealMetric {
  label: string;
  before: string | number;
  after: string | number;
  improvement: string;
  icon: string;
}

@Component({
  selector: 'app-prevention-demo',
  templateUrl: './prevention-demo.component.html',
  styleUrls: ['./prevention-demo.component.scss']
})
export class PreventionDemoComponent implements OnInit, OnDestroy, AfterViewInit {

  // Module identifier for tracking (Landing phase)
  readonly moduleKey = MODULE_KEYS.INBOX_ZERO.LANDING;
  readonly moduleName = 'Inbox Zero';

  // 🎯 UTM Tracking to measure distribution channels
  private utmSource: string = 'direct';
  private utmCampaign: string = '';
  private utmMedium: string = '';

  // Form state (waitlist)
  waitlistEmail = '';
  waitlistSubmitted = false;
  isSubmitting = false;
  errorMessage = '';

  // 🆕 Setup form state
  showSetupFormSection = false; // Controls visibility of entire setup form section
  setupFormData = {
    email: '',
    storeUrl: '',
    printfulApiKey: '',
    platform: 'WooCommerce' // Default
  };
  isSubmittingSetup = false;
  setupSubmitted = false;
  setupErrorMessage = '';

  // 🆕 FAQ accordion state
  expandedFaqIndex: number | null = null;
  
  // 🆕 Tracking flags
  private pricingViewed = false;

  // 🆕 Mobile menu state
  isMobileMenuOpen = false;

  // 🆕 ViewChild for pricing section (IntersectionObserver)
  @ViewChild('pricingSection', { read: ElementRef }) pricingSection?: ElementRef;

  // 🆕 ViewChild for video iframe (play detection)
  @ViewChild('videoIframe', { read: ElementRef }) videoIframe?: ElementRef;

  // Real metrics from production system
  readonly realMetrics: RealMetric[] = [
    {
      label: 'Support tickets/month',
      before: 40,
      after: 8,
      improvement: '-80%',
      icon: 'bi-chat-dots-fill'
    },
    {
      label: 'Time handling tickets',
      before: '~3 hours/month',
      after: '~35 min/month',
      improvement: '-81%',
      icon: 'bi-clock-fill'
    },
    {
      label: '"Where is my order?" questions',
      before: 32,
      after: 0,
      improvement: '-100%',
      icon: 'bi-envelope-fill'
    },
    {
      label: 'Customer satisfaction',
      before: 'Reactive',
      after: 'Proactive',
      improvement: '+40%',
      icon: 'bi-emoji-smile-fill'
    }
  ];

  // Real use cases (questions that are eliminated)
  readonly eliminatedTickets = [
    'Where is my order?',
    'Has it been shipped?',
    'When will it arrive?',
    'What is the tracking number?',
    'Which carrier is delivering it?',
    'Is it being processed?',
    'Did you receive my payment?',
    'Has my order arrived?'
  ];

  // Prevention timeline (simplified)
  readonly preventionFlow = [
    {
      day: 0,
      title: 'Customer purchases',
      action: 'Automatic email: Confirmation + Tracking link',
      icon: 'bi-cart-fill',
      color: '#3b82f6'
    },
    {
      day: 1,
      title: 'Printing started',
      action: 'Automatic email: "Your design is being printed"',
      icon: 'bi-printer-fill',
      color: '#8b5cf6'
    },
    {
      day: 3,
      title: 'Package shipped',
      action: 'Automatic email: Tracking number + estimation',
      icon: 'bi-box-seam-fill',
      color: '#10b981'
    },
    {
      day: 7,
      title: 'Delivered',
      action: 'Automatic email: Confirmation + Request review',
      icon: 'bi-check-circle-fill',
      color: '#059669'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private trackingService: TrackingService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // 🎯 STEP 1: Capture UTMs BEFORE tracking events
    this.route.queryParams.subscribe(params => {
      if (params['utm_source']) {
        this.utmSource = params['utm_source'];
        this.utmCampaign = params['utm_campaign'] || '';
        this.utmMedium = params['utm_medium'] || '';
        
        // Save to sessionStorage for persistence (optional)
        sessionStorage.setItem('inbox_zero_prevention_utm_source', this.utmSource);
        if (this.utmCampaign) {
          sessionStorage.setItem('inbox_zero_prevention_utm_campaign', this.utmCampaign);
        }
        if (this.utmMedium) {
          sessionStorage.setItem('inbox_zero_prevention_utm_medium', this.utmMedium);
        }
      } else {
        // No UTMs in URL, try to recover from sessionStorage
        const savedSource = sessionStorage.getItem('inbox_zero_prevention_utm_source');
        if (savedSource) {
          this.utmSource = savedSource;
          this.utmCampaign = sessionStorage.getItem('inbox_zero_prevention_utm_campaign') || '';
          this.utmMedium = sessionStorage.getItem('inbox_zero_prevention_utm_medium') || '';
        } else {
          // No UTMs, mark as 'direct'
          this.utmSource = 'direct';
          this.utmCampaign = '';
          this.utmMedium = '';
          
          // Clear sessionStorage
          sessionStorage.removeItem('inbox_zero_prevention_utm_source');
          sessionStorage.removeItem('inbox_zero_prevention_utm_campaign');
          sessionStorage.removeItem('inbox_zero_prevention_utm_medium');
        }
      }
    });

    // 🎯 STEP 2: Track page view WITH UTMs
    this.trackEvent('prevention_demo_viewed', {
      timestamp: Date.now()
    });
  }

  /**
   * 🆕 After view init - Setup IntersectionObserver for pricing section and video play tracking
   */
  ngAfterViewInit(): void {
    this.setupPricingObserver();
    
    // Delay video tracking setup to ensure iframe is fully loaded
    setTimeout(() => {
      this.setupVideoPlayTracking();
    }, 2000);
  }

  /**
   * 🆕 On destroy - Clean up body scroll lock
   */
  ngOnDestroy(): void {
    // Always restore body scroll when component is destroyed
    document.body.style.overflow = '';
  }

  /**
   * 🆕 Setup IntersectionObserver for pricing section tracking
   */
  private setupPricingObserver(): void {
    if (!this.pricingSection) return;

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.3 // 30% of section visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.pricingViewed) {
          this.pricingViewed = true;
          this.trackEvent('pricing_viewed', {
            timestamp: Date.now(),
            scrollDepth: Math.round((window.scrollY / document.body.scrollHeight) * 100)
          });
          observer.disconnect(); // Only track once
        }
      });
    }, options);

    observer.observe(this.pricingSection.nativeElement);
  }

  /**
   * 🆕 Handle CTA click from pricing section
   */
  onCtaClicked(plan: string): void {
    this.trackEvent('cta_clicked', {
      plan: plan,
      timestamp: Date.now()
    });
    
    // Smooth scroll to CTA section
    setTimeout(() => {
      const ctaSection = document.getElementById('cta-section-form');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /**
   * 🆕 Submit setup request form
   */
  async submitSetupRequest(): Promise<void> {
    // Validation (only email is required)
    if (!this.setupFormData.email) {
      this.setupErrorMessage = 'Please enter your email';
      return;
    }

    // Email validation
    if (!this.isValidEmail(this.setupFormData.email)) {
      this.setupErrorMessage = 'Please enter a valid email address';
      return;
    }

    // Simple URL validation (only if provided and not empty)
    if (this.setupFormData.storeUrl?.trim() && !this.isValidUrl(this.setupFormData.storeUrl.trim())) {
      this.setupErrorMessage = 'Please enter a valid store URL';
      return;
    }

    this.isSubmittingSetup = true;
    this.setupErrorMessage = '';

    try {
      // Track setup request WITH UTMs
      this.trackEvent('setup_request_submitted', {
        email: this.setupFormData.email,
        storeUrl: this.setupFormData.storeUrl,
        platform: this.setupFormData.platform,
        timestamp: Date.now()
      });

      // 🚪 Send request to backend
      const apiUrl = `${environment.API_URL}/public/inbox-zero/setup-request`;
      const normalizedStoreUrl = this.setupFormData.storeUrl?.trim() ? this.normalizeUrl(this.setupFormData.storeUrl.trim()) : null;
      
      const response: any = await this.http.post(apiUrl, {
        email: this.setupFormData.email,
        storeUrl: normalizedStoreUrl,
        printfulApiKey: this.setupFormData.printfulApiKey,
        platform: this.setupFormData.platform
      }).toPromise();

      if (response.success) {
        // Mark as successful
        this.setupSubmitted = true;

        // Track success WITH UTMs
        this.trackEvent('setup_request_success', {
          tenantId: response.tenantId,
          platform: this.setupFormData.platform,
          timestamp: Date.now()
        });
      } else {
        throw new Error(response.error || 'Request failed');
      }

    } catch (error: any) {
      console.error('Error submitting setup request:', error);
      
      // Extract error message from HTTP error response
      const errorMessage = error?.error?.error || error?.message || 'Something went wrong. Please try again.';
      this.setupErrorMessage = errorMessage;
      
      // Track error WITH UTMs
      this.trackEvent('setup_request_error', {
        error: errorMessage,
        timestamp: Date.now()
      });
    } finally {
      this.isSubmittingSetup = false;
    }
  }

  /**
   * 🆕 Normalize URL - Add https:// if missing
   */
  private normalizeUrl(url: string): string {
    // Add protocol if missing
    return url.startsWith('http') ? url : `https://${url}`;
  }

  /**
   * 🆕 Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlToTest = this.normalizeUrl(url);
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🆕 Toggle FAQ item and track expansion
   */
  toggleFaq(index: number, question: string): void {
    const wasExpanded = this.expandedFaqIndex === index;
    
    // Toggle: if clicking same question, close it; otherwise open new one
    this.expandedFaqIndex = wasExpanded ? null : index;

    // Track only when expanding (not collapsing)
    if (!wasExpanded) {
      this.trackEvent('faq_expanded', {
        question: question,
        questionIndex: index,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🆕 Check if FAQ is expanded
   */
  isFaqExpanded(index: number): boolean {
    return this.expandedFaqIndex === index;
  }

  /**
   * Submit early access request
   */
  async submitWaitlist(): Promise<void> {
    if (!this.waitlistEmail || !this.isValidEmail(this.waitlistEmail)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      // Track intention WITH UTMs
      this.trackEvent('waitlist_submitted', {
        email: this.waitlistEmail,
        timestamp: Date.now()
      });

      // Simulate submission (you can connect with real backend later)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as successful
      this.waitlistSubmitted = true;

      // Track success WITH UTMs
      this.trackEvent('waitlist_success', {
        timestamp: Date.now()
      });

    } catch (error: any) {
      console.error('Error submitting waitlist:', error);
      this.errorMessage = 'Something went wrong. Please try again.';
      
      // Track error WITH UTMs
      this.trackEvent('waitlist_error', {
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Validate email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Navigate to MVP Hub
   */
  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  /**
   * 🆕 Track navbar logo click
   */
  onNavbarLogoClick(): void {
    this.trackEvent('navbar_logo_click', {
      timestamp: Date.now()
    });
  }

  /**
   * 🆕 Scroll to video section smoothly
   */
  scrollToVideo(): void {
    this.trackEvent('scroll_to_video_click', {
      timestamp: Date.now()
    });

    const videoSection = document.getElementById('hero-video-section');
    if (videoSection) {
      videoSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }

  /**
   * 🆕 Show setup form section (triggered after video CTA)
   */
  showSetupForm(): void {
    this.showSetupFormSection = true;
    
    this.trackEvent('setup_form_cta_click', {
      timestamp: Date.now()
    });

    // Smooth scroll to setup form section
    setTimeout(() => {
      const ctaSection = document.getElementById('cta-section-form');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  /**
   * 🆕 Track navbar CTA click
   */
  onNavbarCtaClick(event: Event): void {
    this.trackEvent('navbar_cta_click', {
      timestamp: Date.now()
    });

    // Smooth scroll to CTA section
    setTimeout(() => {
      const ctaSection = document.getElementById('cta-section-form');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /**
   * 🆕 Track video CTA click
   */
  onVideoCtaClick(event: Event): void {
    this.trackEvent('video_cta_click', {
      timestamp: Date.now()
    });

    // Smooth scroll to CTA section
    setTimeout(() => {
      const ctaSection = document.getElementById('cta-section-form');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }



  /**
   * 🆕 Setup video play tracking (YouTube iframe API)
   * Uses YouTube IFrame Player API for reliable event detection
   */
  private setupVideoPlayTracking(): void {
    if (!this.videoIframe) return;

    // Guardar referencia local para evitar undefined en closure
    const iframeElement = this.videoIframe.nativeElement;

    // Flag to track video play only once per session
    let videoPlayed = false;

    // Esperar a que la API de YouTube esté lista
    const initYouTubePlayer = () => {
      if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        setTimeout(initYouTubePlayer, 500);
        return;
      }

      try {
        // Crear player de YouTube
        const player = new YT.Player(iframeElement, {
          events: {
            'onStateChange': (event: any) => {
              // YT.PlayerState.PLAYING === 1
              if (event.data === 1 && !videoPlayed) {
                videoPlayed = true;
                this.trackEvent('video_play', {
                  timestamp: Date.now()
                });
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // Iniciar
    initYouTubePlayer();
  }

  /**
   * Track click on metric WITH UTMs
   */
  trackMetricClick(metric: string): void {
    this.trackEvent('metric_clicked', {
      metric: metric,
      timestamp: Date.now()
    });
  }

  /**
   * Get concrete data context for metrics
   */
  getMetricContext(label: string): string | null {
    const contexts: { [key: string]: string } = {
      'Support tickets/month': '(from 43 to 8 in my own store)',
      'Time handling tickets': '(from 3h to 35min/month)',
      '"Where is my order?" questions': '(from 32 to 0)',
      'Customer satisfaction': '(measurably higher response rates)'
    };
    return contexts[label] || null;
  }

  /**
   * 🆕 Mobile Menu - Toggle open/close
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Lock/unlock body scroll
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Track menu state
    this.trackEvent(this.isMobileMenuOpen ? 'mobile_menu_opened' : 'mobile_menu_closed', {
      timestamp: Date.now()
    });
  }

  /**
   * 🆕 Mobile Menu - Close menu
   */
  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      document.body.style.overflow = '';
      
      this.trackEvent('mobile_menu_closed', {
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🆕 Mobile Menu - Scroll to section by ID
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

      // Track navigation
      this.trackEvent('mobile_menu_navigation', {
        section: sectionId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Track event helper - ALWAYS sends UTMs with all events
   * Replicates old wizard logic for data consistency
   */
  private trackEvent(eventName: string, data: any = {}): void {
    this.trackingService.track(eventName, {
      ...data,
      module: this.moduleKey,
      moduleName: this.moduleName,
      source: this.utmSource,      // 🎯 utm_source (reddit, linkedin, etc.)
      campaign: this.utmCampaign,  // 🎯 utm_campaign (launch_feb2026, etc.)
      medium: this.utmMedium,      // 🎯 utm_medium (social, forum, etc.)
      timestamp: Date.now()
    });
  }
}
