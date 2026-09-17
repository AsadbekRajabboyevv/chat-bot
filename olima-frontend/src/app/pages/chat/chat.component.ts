import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../services/api.service';
import { ChatRequest, ChatResponse, ChatStreamEvent, Message, ToolCallInfo } from '../../models';
import { marked } from 'marked';

interface DisplayMessage {
  role: 'USER' | 'ASSISTANT' | 'TOOL_INFO';
  content?: string;
  toolCalls?: ToolCallInfo[];
  sources?: string[];
  confirmationRequired?: boolean;
  pendingComplaintId?: string;
  isStreaming?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatChipsModule
  ],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <mat-icon>chat_bubble</mat-icon>
        <div class="header-titles">
          <h2>OLIMA Assistant</h2>
          <span class="active-org-name" *ngIf="currentOrgName">{{ currentOrgName }}</span>
        </div>
        <span class="spacer"></span>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="student-input">
          <mat-label>Student ID (Optional)</mat-label>
          <input matInput [(ngModel)]="studentId" placeholder="e.g. 12345">
        </mat-form-field>
      </div>

      <div class="chat-messages" #scrollMe>
        <div class="welcome-message" *ngIf="messages.length === 0">
          <mat-icon class="large-icon">smart_toy</mat-icon>
          <h3>How can I help you today?</h3>
          <p>I can assist you with information, create complaints, and execute tools.</p>
        </div>

        <div *ngFor="let msg of messages; let i = index" class="message-wrapper" [ngClass]="msg.role.toLowerCase()">
          
          <div *ngIf="msg.role === 'USER'" class="message-bubble user-bubble">
            {{ msg.content }}
          </div>
          
          <div *ngIf="msg.role === 'TOOL_INFO'" class="tool-container">
            <mat-expansion-panel class="tool-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="tool-icon">build</mat-icon>
                  <span class="tool-title">Tools Executed ({{msg.toolCalls?.length}})</span>
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <div *ngFor="let tc of msg.toolCalls" class="tool-call-detail">
                <div class="tool-call-header">
                  <strong>{{ tc.toolName }}</strong>
                  <span class="duration">({{ tc.durationMs }}ms)</span>
                  <mat-icon *ngIf="tc.status === 'SUCCESS'" color="primary" class="status-icon">check_circle</mat-icon>
                  <mat-icon *ngIf="tc.status === 'FAILED'" color="warn" class="status-icon">error</mat-icon>
                </div>
                <div class="code-block-title">Input:</div>
                <pre class="code-block">{{ tc.input }}</pre>
                <div class="code-block-title">Output:</div>
                <pre class="code-block">{{ tc.output }}</pre>
              </div>
            </mat-expansion-panel>
          </div>

          <div *ngIf="msg.role === 'ASSISTANT'" class="message-bubble assistant-bubble">
            <div class="markdown-content">
              <span [innerHTML]="renderMarkdown(msg.content || '')"></span>
              <span *ngIf="msg.isStreaming" class="typing-cursor"></span>
            </div>
            
            <mat-chip-set *ngIf="msg.sources && msg.sources.length > 0" class="sources-chips">
              <mat-chip *ngFor="let source of msg.sources" color="accent">
                <mat-icon matChipAvatar>description</mat-icon>
                {{ source }}
              </mat-chip>
            </mat-chip-set>

            <mat-card *ngIf="msg.confirmationRequired" class="confirmation-card">
              <mat-card-header>
                <mat-icon mat-card-avatar color="warn">warning</mat-icon>
                <mat-card-title>Action Requires Confirmation</mat-card-title>
                <mat-card-subtitle>A complaint draft has been created and needs your approval to proceed.</mat-card-subtitle>
              </mat-card-header>
              <mat-card-actions align="end">
                <button mat-button color="warn" (click)="cancelConfirmation()">Cancel</button>
                <button mat-raised-button color="primary" (click)="confirmAction(msg.pendingComplaintId)">Confirm Action</button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>

        <div class="loading-indicator" *ngIf="loading">
          <mat-spinner diameter="30"></mat-spinner>
          <span>OLIMA is thinking...</span>
        </div>
      </div>

      <div class="chat-input-area">
        <mat-form-field appearance="outline" class="input-field" subscriptSizing="dynamic">
          <textarea matInput 
                    [(ngModel)]="userInput" 
                    placeholder="Type your message here... (Shift+Enter for new line)"
                    rows="1" 
                    cdkTextareaAutosize
                    cdkAutosizeMinRows="1"
                    cdkAutosizeMaxRows="5"
                    (keydown)="onKeyDown($event)"></textarea>
          <button mat-icon-button matSuffix color="primary" (click)="sendMessage()" [disabled]="!userInput.trim() || loading">
            <mat-icon>send</mat-icon>
          </button>
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border-radius: 12px;
      overflow: hidden;
    }
    .chat-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      background: #1a237e;
      color: white;
      gap: 12px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .chat-header h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 500;
      line-height: 1.2;
    }
    .active-org-name {
      font-size: 12px;
      color: #90caf9;
      font-weight: 400;
    }
    .spacer { flex: 1; }
    .student-input { width: 200px; }
    ::ng-deep .student-input .mat-mdc-text-field-wrapper { background-color: rgba(255,255,255,0.1) !important; }
    ::ng-deep .student-input input { color: white !important; }
    ::ng-deep .student-input .mat-mdc-form-field-focus-overlay { background-color: transparent; }
    ::ng-deep .student-input mat-label { color: rgba(255,255,255,0.7) !important; }

    .chat-messages {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: #f8f9fa;
    }
    .welcome-message {
      text-align: center;
      color: #666;
      margin: auto;
    }
    .large-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #1a237e;
      margin-bottom: 16px;
    }
    
    .message-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .message-wrapper.user { align-items: flex-end; }
    .message-wrapper.assistant { align-items: flex-start; }
    .message-wrapper.tool_info { align-items: stretch; margin: 8px 0; }
    
    .message-bubble {
      max-width: 80%;
      padding: 16px 20px;
      border-radius: 18px;
      line-height: 1.5;
      font-size: 15px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .user-bubble {
      background: #1a237e;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .assistant-bubble {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      border: 1px solid #eee;
    }
    
    .tool-container {
      margin: 0 auto;
      width: 90%;
    }
    .tool-panel {
      background: #f0f4f8;
      box-shadow: none !important;
      border: 1px solid #d9e2ec;
    }
    .tool-icon { color: #5c6ac4; margin-right: 8px; }
    .tool-title { font-weight: 500; color: #334e68; }
    .tool-call-detail {
      background: white;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    .tool-call-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .duration { color: #718096; font-size: 12px; }
    .status-icon { font-size: 18px; height: 18px; width: 18px; }
    .code-block-title { font-size: 12px; color: #718096; margin-bottom: 4px; text-transform: uppercase; }
    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
      overflow-x: auto;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }
    
    .markdown-content ::ng-deep p { margin-top: 0; }
    .markdown-content ::ng-deep pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
    .markdown-content ::ng-deep code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    
    .typing-cursor {
      display: inline-block;
      width: 8px;
      height: 16px;
      background-color: #1a237e;
      margin-left: 4px;
      vertical-align: text-bottom;
      animation: blink 0.8s infinite;
      border-radius: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .sources-chips { margin-top: 16px; }
    
    .confirmation-card {
      margin-top: 16px;
      background: #fff8e1;
      border: 1px solid #ffe082;
    }
    
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      padding: 16px;
    }

    .chat-input-area {
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #eee;
    }
    .input-field {
      width: 100%;
    }
    ::ng-deep .input-field .mat-mdc-text-field-wrapper {
      border-radius: 24px;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  
  messages: DisplayMessage[] = [];
  userInput = '';
  studentId = '';
  loading = false;
  conversationId?: string;
  currentOrgName = '';

  private orgChangeListener = () => {
    this.conversationId = undefined;
    this.messages = [];
    this.loadCurrentOrg();
  };

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCurrentOrg();
    window.addEventListener('orgChanged', this.orgChangeListener);
    this.scrollToBottom();
  }

  ngOnDestroy() {
    window.removeEventListener('orgChanged', this.orgChangeListener);
  }

  loadCurrentOrg() {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getOrganization(orgId).subscribe({
        next: (org) => {
          this.currentOrgName = org.name;
        },
        error: () => {}
      });
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  renderMarkdown(text: string): string {
    return marked.parse(text) as string;
  }

  sendMessage() {
    if (!this.userInput.trim() || this.loading) return;

    const orgId = localStorage.getItem('selectedOrgId');
    if (!orgId) {
      alert('Please select an organization first from the top bar.');
      return;
    }

    const messageText = this.userInput;
    this.userInput = '';
    
    this.messages.push({ role: 'USER', content: messageText });
    this.loading = true;

    const request: ChatRequest = {
      organizationId: orgId,
      message: messageText,
      conversationId: this.conversationId,
      studentId: this.studentId || undefined
    };

    let toolInfoMsg: DisplayMessage | null = null;
    let assistantMsg: DisplayMessage | null = null;

    this.apiService.chatStream(request).subscribe({
      next: (event: ChatStreamEvent) => {
        if (event.type === 'INIT') {
          if (event.conversationId) {
            this.conversationId = event.conversationId;
          }
        } else if (event.type === 'TOOL_CALL' && event.toolCall) {
          if (!toolInfoMsg) {
            toolInfoMsg = {
              role: 'TOOL_INFO',
              toolCalls: [event.toolCall]
            };
            this.messages.push(toolInfoMsg);
          } else {
            toolInfoMsg.toolCalls?.push(event.toolCall);
          }
          this.scrollToBottom();
        } else if (event.type === 'CONTENT' && event.content) {
          this.loading = false;
          if (!assistantMsg) {
            assistantMsg = {
              role: 'ASSISTANT',
              content: event.content,
              isStreaming: true
            };
            this.messages.push(assistantMsg);
          } else {
            assistantMsg.content = (assistantMsg.content || '') + event.content;
          }
          this.cdr.detectChanges();
          this.scrollToBottom();
        } else if (event.type === 'COMPLETE') {
          this.loading = false;
          if (event.conversationId) {
            this.conversationId = event.conversationId;
          }
          if (assistantMsg) {
            assistantMsg.isStreaming = false;
            assistantMsg.sources = event.sources;
            assistantMsg.confirmationRequired = event.confirmationRequired;
            assistantMsg.pendingComplaintId = event.pendingComplaintId;
          }
          this.cdr.detectChanges();
          this.scrollToBottom();
        } else if (event.type === 'ERROR') {
          this.loading = false;
          if (assistantMsg) {
            assistantMsg.isStreaming = false;
          } else {
            this.messages.push({
              role: 'ASSISTANT',
              content: 'Sorry, I encountered an error: ' + (event.content || 'Unknown error')
            });
          }
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: (err) => {
        console.error('Chat stream error', err);
        this.loading = false;
        if (assistantMsg) {
          assistantMsg.isStreaming = false;
        } else {
          this.messages.push({
            role: 'ASSISTANT',
            content: 'Sorry, I encountered an error: ' + (err.message || 'Communication failure')
          });
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        this.loading = false;
        if (assistantMsg) {
          assistantMsg.isStreaming = false;
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    });
  }

  confirmAction(complaintId?: string) {
    if (!complaintId || !this.conversationId) return;
    
    this.loading = true;
    this.apiService.confirmAction(this.conversationId, complaintId).subscribe({
      next: (response: ChatResponse) => {
        this.messages.push({ role: 'USER', content: 'Action Confirmed.' });
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          this.messages.push({ role: 'TOOL_INFO', toolCalls: response.toolCalls });
        }

        this.messages.push({
          role: 'ASSISTANT',
          content: response.message,
          sources: response.sources
        });
        
        this.loading = false;
      },
      error: () => {
        this.messages.push({ role: 'ASSISTANT', content: 'Error confirming action.' });
        this.loading = false;
      }
    });
  }

  cancelConfirmation() {
    this.messages.push({ role: 'USER', content: 'Action Cancelled.' });
    this.messages.push({ role: 'ASSISTANT', content: 'The action has been cancelled.' });
  }
}
