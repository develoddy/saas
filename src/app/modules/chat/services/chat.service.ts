import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from 'src/app/services/auth.service';
import { URL_BACKEND, URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  private apiUrl: string;
  
  private conversationId: number | null = null;
  private sessionId: string | null = null;
  
  // Observables for UI
  private messagesSubject = new BehaviorSubject<any[]>([]);
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  private typingStatusSubject = new BehaviorSubject<{isTyping: boolean, name: string}>({isTyping: false, name: ''});
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  public messages$ = this.messagesSubject.asObservable();
  public isConnected$ = this.isConnectedSubject.asObservable();
  public isChatOpen$ = this.isChatOpenSubject.asObservable();
  public typingStatus$ = this.typingStatusSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    const svc = (typeof URL_SERVICE !== 'undefined' && URL_SERVICE) ? URL_SERVICE : `${URL_BACKEND}/api`;
    const cleaned = svc.replace(/\/+$/g, '');
    this.apiUrl = `${cleaned}/chat`;

    this.sessionId = localStorage.getItem('chat_session_id');
    
    const unreadCount = localStorage.getItem('chat_unread_count');
    if (unreadCount) {
      this.unreadCountSubject.next(parseInt(unreadCount, 10));
    }
  }

  private initSocketConnection(): void {
    if (this.socket && this.socket.connected) {
      return;
    }
    
    this.socket = io(URL_BACKEND, {
      transports: ['websocket'],
      upgrade: false
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.isConnectedSubject.next(true);
      
      if (this.sessionId) {
        this.identifyUser();
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.isConnectedSubject.next(false);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnectedSubject.next(false);
    });
    
    this.setupChatEvents();
  }
  
  private setupChatEvents(): void {
    this.socket?.on('conversation-ready', (data) => {
      console.log('Conversation ready:', data);
      this.conversationId = data.conversation_id;
      this.requestChatHistory();
    });
    
    this.socket?.on('new-message', (message) => {
      console.log('New message received:', message);
      
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
      
      if (message.sender_type === 'agent' && !this.isChatOpenSubject.value) {
        const currentCount = this.unreadCountSubject.value;
        this.unreadCountSubject.next(currentCount + 1);
        localStorage.setItem('chat_unread_count', (currentCount + 1).toString());
      }
      
      if (this.isChatOpenSubject.value && message.sender_type === 'agent') {
        this.markMessagesAsRead();
      }
    });
    
    this.socket?.on('agent-joined', (data) => {
      console.log('Agent joined:', data);
    });
    
    this.socket?.on('conversation-closed', (data) => {
      console.log('Conversation closed:', data);
    });
    
    this.socket?.on('typing-update', (data) => {
      if (data.is_agent && data.is_typing) {
        this.typingStatusSubject.next({
          isTyping: true, 
          name: data.user_name || 'Agent'
        });
      } else {
        this.typingStatusSubject.next({
          isTyping: false,
          name: ''
        });
      }
    });
    
    this.socket?.on('chat-history', (data) => {
      console.log('Chat history received:', data);
      if (data.conversation_id === this.conversationId) {
        this.messagesSubject.next(data.messages || []);
      }
    });
    
    this.socket?.on('error', (error) => {
      console.error('Chat error:', error);
    });
  }
  
  private identifyUser(): void {
    const currentUser = this.authService.userSubject.value;
    const currentGuestUser = this.authService.userGuestSubject.value;

    console.log("Guest user:", currentGuestUser);
    
    let guestId = currentGuestUser?.id || localStorage.getItem('chat_guest_user') || null;

    console.log("Get guestId: ", guestId);

    const userData = {
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: guestId
    };
    
    console.log('Identifying user:', userData);
    this.socket?.emit('identify-user', userData);
  }
  
  public initChat(): Observable<any> {
    if (this.sessionId) {
      return new Observable(observer => {
        observer.next({ session_id: this.sessionId });
        observer.complete();
      });
    }
    
    const currentUser = this.authService.userSubject.value;
    const currentGuestUser = this.authService.userGuestSubject.value;

    let guestId = currentGuestUser?._id || currentGuestUser?.id || localStorage.getItem('chat_guest_id') || null;
    if (!guestId && !currentUser) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
      localStorage.setItem('chat_guest_id', guestId);
    }

    const userData: any = {
      user_id: currentUser?._id
    };
    if (guestId) userData.guest_id = guestId;
    
    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/init`, userData).subscribe({
        next: (response: any) => {
          if (response.success && response.conversation) {
            this.sessionId = response.conversation.session_id;
            if (this.sessionId) {
              localStorage.setItem('chat_session_id', this.sessionId);
            }
            
            this.initSocketConnection();
            this.identifyUser();
            
            observer.next(response);
            observer.complete();
          } else {
            observer.error(new Error('Could not initialize chat'));
          }
        },
        error: (err) => {
          console.error('Error initializing chat:', err);
          observer.error(err);
        }
      });
    });
  }
  
  public openChat(): void {
    if (!this.sessionId) {
      this.initChat().subscribe();
    } else if (!this.socket || !this.socket.connected) {
      this.initSocketConnection();
    }
    
    this.isChatOpenSubject.next(true);
    
    this.unreadCountSubject.next(0);
    localStorage.setItem('chat_unread_count', '0');
    
    if (this.conversationId) {
      this.markMessagesAsRead();
    }
  }
  
  public closeChat(): void {
    this.isChatOpenSubject.next(false);
  }
  
  public requestChatHistory(): void {
    if (!this.conversationId || !this.socket) return;
    
    this.socket?.emit('get-history', {
      conversation_id: this.conversationId
    });
  }
  
  public sendMessage(message: string): void {
    if (!this.conversationId || !this.sessionId || !this.socket) {
      console.error('Cannot send message: missing session information');
      return;
    }
    
    const currentUser = this.authService.userSubject.value;
    const currentGuestUser = this.authService.userGuestSubject.value;
    
    this.socket?.emit('user-message', {
      conversation_id: this.conversationId,
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: currentGuestUser?._id || currentGuestUser?.id,
      message
    });
  }
  
  public sendTypingStatus(isTyping: boolean): void {
    if (!this.conversationId || !this.sessionId || !this.socket) return;
    
    const currentUser = this.authService.userSubject.value;
    const userName = currentUser?.firstname || 'User';
    
    if (isTyping) {
      this.socket?.emit('typing', {
        conversation_id: this.conversationId,
        session_id: this.sessionId,
        is_agent: false,
        user_name: userName
      });
    } else {
      this.socket?.emit('stopped-typing', {
        conversation_id: this.conversationId,
        session_id: this.sessionId,
        is_agent: false
      });
    }
  }
  
  public markMessagesAsRead(): void {
    if (!this.conversationId || !this.sessionId || !this.socket) return;
    
    this.socket?.emit('mark-read', {
      conversation_id: this.conversationId,
      session_id: this.sessionId,
      reader_type: 'user'
    });
  }
  
  public requestSupport(data: {name?: string, email?: string, issue?: string}): void {
    const currentUser = this.authService.userSubject.value;
    const currentGuestUser = this.authService.userGuestSubject.value;
    
    if (!this.socket || !this.socket.connected) {
      this.initSocketConnection();
    }
    
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('chat_session_id', this.sessionId);
    }
    
    this.socket?.emit('request-support', {
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: currentGuestUser?._id || currentGuestUser?.id,
      name: data.name || currentUser?.firstname || 'User',
      email: data.email || currentUser?.email || '',
      issue: data.issue
    });
    
    this.openChat();
  }
  
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.isConnectedSubject.next(false);
    this.messagesSubject.next([]);
  }
  
  public endChat(): void {
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('chat_unread_count');
    
    this.sessionId = null;
    this.conversationId = null;
    this.messagesSubject.next([]);
    this.unreadCountSubject.next(0);
    this.isChatOpenSubject.next(false);
    
    this.disconnect();
  }
}
