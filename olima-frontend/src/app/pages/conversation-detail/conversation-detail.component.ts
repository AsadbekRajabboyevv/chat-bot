import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { Conversation } from '../../models';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page-container" *ngIf="conversation">
      <h2>{{ conversation.title || 'Suhbat tafsilotlari' }}</h2>
      <div class="messages-container">
        <div *ngFor="let msg of conversation.messages" class="message-wrapper" [ngClass]="msg.role.toLowerCase()">
          <div class="message-bubble">
            <div class="role-badge">{{ msg.role === 'USER' ? 'Foydalanuvchi' : (msg.role === 'ASSISTANT' ? 'OLIMA Yordamchisi' : msg.role) }}</div>
            <div class="content">{{ msg.content }}</div>
            <div class="time">{{ msg.createdAt | date:'shortTime' }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .messages-container { display: flex; flex-direction: column; gap: 16px; }
    .message-wrapper { display: flex; }
    .message-wrapper.user { justify-content: flex-end; }
    .message-wrapper.assistant { justify-content: flex-start; }
    .message-bubble { max-width: 80%; padding: 16px; border-radius: 8px; position: relative; }
    .user .message-bubble { background: #e3f2fd; border-bottom-right-radius: 0; }
    .assistant .message-bubble { background: #f5f5f5; border-bottom-left-radius: 0; }
    .role-badge { font-size: 10px; color: #666; margin-bottom: 4px; font-weight: bold; }
    .time { font-size: 10px; color: #999; text-align: right; margin-top: 8px; }
    .content { white-space: pre-wrap; }
  `]
})
export class ConversationDetailComponent implements OnInit {
  conversation: Conversation | null = null;

  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.apiService.getConversation(id).subscribe(data => this.conversation = data);
    }
  }
}
