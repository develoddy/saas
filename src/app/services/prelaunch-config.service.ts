import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * PrelaunchConfigService Stub for Chat Module
 * Simplified service for app-saas - chat is always enabled
 */
@Injectable({
  providedIn: 'root'
})
export class PrelaunchConfigService {
  // Always false - chat is always enabled in app-saas
  private isPrelaunchEnabledSubject = new BehaviorSubject<boolean>(false);
  public isPrelaunchEnabled$ = this.isPrelaunchEnabledSubject.asObservable();

  constructor() {}

  /**
   * Always returns false - no prelaunch mode in app-saas
   */
  isPrelaunchEnabled(): boolean {
    return false;
  }
}
