import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SequenceEmail } from '../onboarding/models/onboarding-wizard.models';

@Component({
  selector: 'app-sequence-email-card',
  templateUrl: './sequence-email-card.component.html',
  styleUrls: ['./sequence-email-card.component.scss']
})
export class SequenceEmailCardComponent {
  @Input() email!: SequenceEmail;
  @Input() index: number = 0;
  @Output() emailEdited = new EventEmitter<Partial<SequenceEmail>>();

  isEditing = false;
  editedSubject = '';
  editedBodyText = '';

  startEditing(): void {
    this.isEditing = true;
    this.editedSubject = this.email.subject;
    this.editedBodyText = this.stripHtmlTags(this.email.bodyHtml);
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.editedSubject = '';
    this.editedBodyText = '';
  }

  saveChanges(): void {
    if (this.editedSubject.trim() && this.editedBodyText.trim()) {
      const updates: Partial<SequenceEmail> = {
        subject: this.editedSubject,
        bodyText: this.editedBodyText,
        bodyHtml: this.convertTextToHtml(this.editedBodyText)
      };

      this.emailEdited.emit(updates);
      this.isEditing = false;
    }
  }

  private stripHtmlTags(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  private convertTextToHtml(text: string): string {
    return text
      .split('\n')
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  getEmailNumber(): number {
    return this.index + 1;
  }

  getDelayLabel(): string {
    if (this.email.delayHours === 0) return 'Sent immediately';
    const days = this.email.delayHours / 24;
    return days === 1 ? 'Sent after 1 day' : `Sent after ${days} days`;
  }
}
