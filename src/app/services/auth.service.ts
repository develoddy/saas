import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * AuthService Stub for Chat Module
 * Simplified service for guest-only chat functionality in app-saas
 * Always returns null for authenticated users and auto-generates guest_id
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Always null - app-saas chat is guest-only
  public userSubject = new BehaviorSubject<any>(null);
  public user = this.userSubject.asObservable();
  
  // Auto-generated guest user
  public userGuestSubject = new BehaviorSubject<any>(this.getOrCreateGuest());
  public userGuest = this.userGuestSubject.asObservable();

  constructor() {}

  /**
   * Always returns false - no authenticated users in app-saas chat
   */
  isAuthenticatedUser(): boolean {
    return false;
  }

  /**
   * Always returns true - everyone is a guest in app-saas
   */
  isGuestUser(): boolean {
    return true;
  }

  /**
   * Gets existing guest from localStorage or creates new one
   */
  private getOrCreateGuest(): any {
    const storedGuest = localStorage.getItem('chat_guest_user');
    
    if (storedGuest) {
      try {
        return JSON.parse(storedGuest);
      } catch (e) {
        console.warn('Failed to parse stored guest, creating new one');
      }
    }
    
    // Create new guest
    const newGuest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      _id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      session_id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'guest',
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('chat_guest_user', JSON.stringify(newGuest));
    return newGuest;
  }

  /**
   * Returns the current guest user
   */
  getGuestUser(): any {
    return this.userGuestSubject.value;
  }
}
