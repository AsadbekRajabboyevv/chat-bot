import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { Conversation } from '../../models';
import { marked } from 'marked';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page-container" *ngIf="conversation">
      <h2>{{ heading }}</h2>
      <div class="messages-container">
        <div *ngFor="let msg of conversation.messages" class="message-wrapper" [ngClass]="msg.role.toLowerCase()">
          <div class="message-bubble">
            <div class="role-badge">{{ msg.role === 'USER' ? 'Foydalanuvchi' : (msg.role === 'ASSISTANT' ? 'OLIMA Yordamchisi' : msg.role) }}</div>
            <div class="content" *ngIf="msg.role !== 'ASSISTANT'">{{ msg.content }}</div>
            <!-- Javob markdown'da keladi; innerHTML'ni Angular sanitizatsiya qiladi -->
            <div class="content md" *ngIf="msg.role === 'ASSISTANT'" [innerHTML]="render(msg.content)"></div>
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
    .content.md { white-space: normal; line-height: 1.55; }
    :host ::ng-deep .md :first-child { margin-top: 0; }
    :host ::ng-deep .md :last-child { margin-bottom: 0; }
    :host ::ng-deep .md h1, :host ::ng-deep .md h2, :host ::ng-deep .md h3, :host ::ng-deep .md h4 { font-size: 15px; margin: 12px 0 6px; }
    :host ::ng-deep .md p { margin: 0 0 8px; }
    :host ::ng-deep .md ul, :host ::ng-deep .md ol { margin: 0 0 8px; padding-left: 20px; }
    :host ::ng-deep .md li { margin: 2px 0; }
    :host ::ng-deep .md a { color: var(--brand, #6366f1); word-break: break-word; }
    :host ::ng-deep .md code { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 4px; font-size: 13px; }
    :host ::ng-deep .md table { border-collapse: collapse; margin: 8px 0; font-size: 13px; display: block; overflow-x: auto; }
    :host ::ng-deep .md th, :host ::ng-deep .md td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
    :host ::ng-deep .md th { background: #f8fafc; }
  `]
})
export class ConversationDetailComponent implements OnInit {
  conversation: Conversation | null = null;

  private readonly cache = new Map<string, string>();

  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  /** Backend avtomatik sarlavhani inglizcha yozadi ("Chat with X") — ko'rsatishda o'zbekchalashtiriladi. */
  get heading(): string {
    const t = this.conversation?.title?.trim();
    if (!t) return 'Suhbat tafsilotlari';
    return t.startsWith('Chat with ') ? 'Suhbat: ' + t.slice('Chat with '.length) : t;
  }

  /** Chat sahifasidagidek: ```map/```geo bloklari (xom JSON) ko'rsatilmaydi. */
  render(text: string): string {
    if (!text) return '';
    let html = this.cache.get(text);
    if (html === undefined) {
      html = marked.parse(text.replace(/```(?:map|geo)\s*\{[\s\S]*?\}\s*```/gi, '')) as string;
      this.cache.set(text, html);
    }
    return html;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.apiService.getConversation(id).subscribe(data => this.conversation = data);
    }
  }
}
