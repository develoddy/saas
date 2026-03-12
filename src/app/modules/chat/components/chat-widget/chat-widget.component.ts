import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { AuthService } from 'src/app/services/auth.service';
import { PrelaunchConfigService } from 'src/app/services/prelaunch-config.service';
import { TrackingService } from 'src/app/services/tracking.service';

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: any[] = [];
  isConnected = false;
  isChatOpen = false;
  messageControl = new FormControl('', [Validators.required]);
  typingStatus: { isTyping: boolean, name: string } = { isTyping: false, name: '' };
  unreadCount = 0;
  showCloseConfirm = false;
  isChatEnabled = true;
  
  private typingSubject = new Subject<string>();
  private subscriptions = new Subscription();
  
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private prelaunchConfigService: PrelaunchConfigService,
    private trackingService: TrackingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Hide chat widget on tracking pages
    this.checkRouteAndHideChat();
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.checkRouteAndHideChat();
        })
    );

    // Subscribe to chat messages
    this.subscriptions.add(
      this.chatService.messages$.subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
      })
    );
    
    // Subscribe to connection status
    this.subscriptions.add(
      this.chatService.isConnected$.subscribe(isConnected => {
        this.isConnected = isConnected;
      })
    );
    
    // Subscribe to chat open status
    this.subscriptions.add(
      this.chatService.isChatOpen$.subscribe(isOpen => {
        this.isChatOpen = isOpen;
        if (isOpen) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      })
    );
    
    // Subscribe to typing status
    this.subscriptions.add(
      this.chatService.typingStatus$.subscribe(status => {
        this.typingStatus = status;
      })
    );
    
    // Subscribe to unread count
    this.subscriptions.add(
      this.chatService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
    
    // Setup typing detection
    this.setupTypingDetection();
    
    // Subscribe to prelaunch status (always enabled in app-saas)
    this.subscriptions.add(
      this.prelaunchConfigService.isPrelaunchEnabled$.subscribe(isPrelaunchEnabled => {
        this.isChatEnabled = !isPrelaunchEnabled;
        
        if (isPrelaunchEnabled && this.isChatOpen) {
          this.closeChat();
        }
        
        this.cdr.detectChanges();
      })
    );
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  private setupTypingDetection(): void {
    this.subscriptions.add(
      this.messageControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(value => {
        const isTyping = !!(value && value.trim().length > 0);
        this.chatService.sendTypingStatus(isTyping);
      })
    );
  }

  private checkRouteAndHideChat(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/tracking')) {
      this.isChatEnabled = false;
      if (this.isChatOpen) {
        this.closeChat();
      }
      this.cdr.detectChanges();
    } else if (!this.prelaunchConfigService.isPrelaunchEnabled()) {
      this.isChatEnabled = true;
      this.cdr.detectChanges();
    }
  }
  
  openChat(): void {
    this.chatService.openChat();
    this.trackingService.track('chat_opened', this.getTrackingContext());
  }
  
  closeChat(): void {
    this.chatService.closeChat();
    this.trackingService.track('chat_closed', this.getTrackingContext());
  }

  confirmAbandon(): void {
    this.showCloseConfirm = false;

    try {
      this.chatService.endChat();
    } catch (err) {
      console.error('Error ending chat session:', err);
    }

    this.messages = [];
    try { this.messageControl.reset(); } catch (e) {}
    try { this.cdr.detectChanges(); } catch (e) {}
    
    this.trackingService.track('chat_closed', this.getTrackingContext());
  }
  
  sendMessage(): void {
    if (this.messageControl.invalid || !this.messageControl.value?.trim()) {
      return;
    }
    
    const message = this.messageControl.value.trim();
    this.chatService.sendMessage(message);
    
    this.messageControl.reset();
    
    this.trackingService.track('chat_message_sent', this.getTrackingContext());
  }
  
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }
  
  initNewChat(): void {
    this.chatService.initChat().subscribe({
      next: () => this.openChat(),
      error: error => console.error('Error initializing chat:', error)
    });
  }
  
  endChat(): void {
    this.chatService.endChat();
  }
  
  isSentByMe(message: any): boolean {
    return message.sender_type === 'user';
  }
  
  isSystemMessage(message: any): boolean {
    return message.sender_type === 'system';
  }
  
  handleEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Get tracking context from sessionStorage
   * Includes module and UTM parameters saved by landing components
   */
  private getTrackingContext(): any {
    // Detect current module from URL
    const path = window.location.pathname;
    let currentModule: string | undefined;
    let currentModuleName: string | undefined;
    
    if (path.includes('/inbox-zero-prevention')) {
      currentModule = 'inbox-zero-prevention';
      currentModuleName = 'Inbox Zero';
    }
    // Add more modules as needed
    
    // Try to get UTMs from sessionStorage (saved by landing components)
    const utmSource = sessionStorage.getItem('inbox_zero_prevention_utm_source');
    const utmCampaign = sessionStorage.getItem('inbox_zero_prevention_utm_campaign');
    const utmMedium = sessionStorage.getItem('inbox_zero_prevention_utm_medium');
    
    return {
      timestamp: Date.now(),
      module: currentModule,
      moduleName: currentModuleName,
      source: utmSource || 'direct',  // Default to 'direct' when no UTMs
      campaign: utmCampaign || '',
      medium: utmMedium || ''
    };
  }
}
