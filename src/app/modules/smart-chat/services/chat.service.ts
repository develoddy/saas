import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TenantConfig {
  id?: number;
  tenant_id: number;
  widget_color: string;
  widget_position: 'bottom-right' | 'bottom-left';
  welcome_message: string;
  business_hours?: any;
  timezone?: string;
  auto_response_enabled?: boolean;
  capture_leads?: boolean;
  allowed_domains?: string[];
  iframe_url?: string | null;
  max_agents?: number;
  integration_type: 'iframe' | 'crisp' | 'intercom' | 'native';
  integration_config?: any;
  is_active: boolean;
}

export interface ChatStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  avg_response_time: string;
  conversations_by_status: {
    open: number;
    closed: number;
    pending: number;
  };
}

export interface Conversation {
  id: number;
  tenant_id: number;
  user_id?: number;
  guest_id?: string;
  session_id: string;
  is_active: boolean;
  status: 'open' | 'closed' | 'pending';
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  agent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'agent' | 'system';
  sender_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.API_URL || 'http://localhost:3500';
  private tenantId: number = 1; // TODO: Obtener del contexto del usuario logueado

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId.toString()
    });
  }

  // --- Configuración ---
  getConfig(): Observable<TenantConfig> {
    return this.http.get<TenantConfig>(
      `${this.apiUrl}/chat/tenant/config`,
      { headers: this.headers }
    );
  }

  updateConfig(config: Partial<TenantConfig>): Observable<TenantConfig> {
    return this.http.put<TenantConfig>(
      `${this.apiUrl}/chat/tenant/config`,
      config,
      { headers: this.headers }
    );
  }

  // --- Estadísticas ---
  getStats(): Observable<ChatStats> {
    return this.http.get<ChatStats>(
      `${this.apiUrl}/chat/tenant/stats`,
      { headers: this.headers }
    );
  }

  // --- Conversaciones ---
  getConversations(params?: { status?: string; limit?: number }): Observable<Conversation[]> {
    let url = `${this.apiUrl}/chat/tenant/conversations`;
    const queryParams: string[] = [];
    
    if (params?.status) queryParams.push(`status=${params.status}`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    return this.http.get<Conversation[]>(url, { headers: this.headers });
  }

  getConversationMessages(conversationId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/chat/tenant/conversations/${conversationId}/messages`,
      { headers: this.headers }
    );
  }

  sendMessage(conversationId: number, message: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chat/tenant/messages/send`,
      { conversation_id: conversationId, message, sender_type: 'agent' },
      { headers: this.headers }
    );
  }

  // --- Agentes ---
  getAgents(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/chat/tenant/agents`,
      { headers: this.headers }
    );
  }

  inviteAgent(agentData: { agent_name: string; agent_email: string }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chat/tenant/agents`,
      agentData,
      { headers: this.headers }
    );
  }

  // --- Utils ---
  setTenantId(tenantId: number): void {
    this.tenantId = tenantId;
  }

  generateEmbedCode(tenantId: number): string {
    return `<!-- Smart Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${this.apiUrl}/widget/chat-widget.js';
    script.setAttribute('data-tenant-id', '${tenantId}');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  }
}
