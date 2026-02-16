import { Component, OnInit } from '@angular/core';
import { ChatService, Conversation, ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.scss']
})
export class ConversationsComponent implements OnInit {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  loading = true;
  sendingMessage = false;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.loading = true;
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations;
        this.loading = false;
        
        // Auto-select first conversation
        if (conversations.length > 0 && !this.selectedConversation) {
          this.selectConversation(conversations[0]);
        }
      },
      error: (err) => {
        console.error('Error loading conversations:', err);
        this.loading = false;
      }
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.loadMessages(conversation.id);
  }

  loadMessages(conversationId: number): void {
    this.chatService.getConversationMessages(conversationId).subscribe({
      next: (messages) => {
        this.messages = messages;
      },
      error: (err) => {
        console.error('Error loading messages:', err);
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation) return;

    this.sendingMessage = true;
    const message = this.newMessage;
    this.newMessage = '';

    this.chatService.sendMessage(this.selectedConversation.id, message).subscribe({
      next: () => {
        this.loadMessages(this.selectedConversation!.id);
        this.sendingMessage = false;
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.newMessage = message; // Restore message
        this.sendingMessage = false;
      }
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }
}
