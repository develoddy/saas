import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TrackingService } from '@shared/../services/tracking.service';
import { MODULE_KEYS } from '@config/module-keys';
import { environment } from 'src/environments/environment';

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
export class PreventionDemoComponent implements OnInit, AfterViewInit {

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
  showSetupForm = false;
  showFormFields = false; // Controls visibility of form fields in CTA section
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

  // 🆕 ViewChild for pricing section (IntersectionObserver)
  @ViewChild('pricingSection', { read: ElementRef }) pricingSection?: ElementRef;

  // 🆕 ViewChild for video section (IntersectionObserver)
  @ViewChild('videoSection', { read: ElementRef }) videoSection?: ElementRef;

  // 🆕 ViewChild for video iframe (play detection)
  @ViewChild('videoIframe', { read: ElementRef }) videoIframe?: ElementRef;

  // 🆕 Tracking flags for video
  private videoSectionViewed = false;

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
   * 🆕 After view init - Setup IntersectionObserver for pricing and video sections
   */
  ngAfterViewInit(): void {
    this.setupPricingObserver();
    this.setupVideoSectionObserver();
    this.setupVideoPlayTracking();
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
   * 🆕 Show form fields in CTA section
   */
  onShowFormFields(): void {
    this.showFormFields = true;
    
    // Track form reveal
    this.trackEvent('setup_form_revealed', {
      timestamp: Date.now()
    });
    
    // Smooth scroll to ensure form is visible
    setTimeout(() => {
      const ctaSection = document.getElementById('cta-section-form');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
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
   * 🆕 Setup IntersectionObserver for video section tracking
   */
  private setupVideoSectionObserver(): void {
    if (!this.videoSection) return;

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.4 // 40% of section visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.videoSectionViewed) {
          this.videoSectionViewed = true;
          this.trackEvent('video_section_view', {
            timestamp: Date.now(),
            scrollDepth: Math.round((window.scrollY / document.body.scrollHeight) * 100)
          });
          observer.disconnect(); // Only track once
        }
      });
    }, options);

    observer.observe(this.videoSection.nativeElement);
  }

  /**
   * 🆕 Setup video play tracking (YouTube iframe API)
   * This attempts to detect when the video starts playing
   */
  private setupVideoPlayTracking(): void {
    if (!this.videoIframe) return;

    // Listen for postMessage from YouTube iframe (requires enablejsapi=1)
    window.addEventListener('message', (event) => {
      // Check if message is from YouTube
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = JSON.parse(event.data);
        
        // YouTube iframe API sends event: "onStateChange" with info.playerState
        // playerState: 1 = playing
        if (data.event === 'onStateChange' && data.info?.playerState === 1) {
          this.trackEvent('video_play', {
            timestamp: Date.now()
          });
        }
      } catch (e) {
        // Ignore parsing errors from other postMessage events
      }
    });
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
