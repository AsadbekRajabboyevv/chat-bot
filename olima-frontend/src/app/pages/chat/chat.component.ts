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
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, NavigationStart } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { ChatRequest, ChatResponse, ChatStreamEvent, Conversation, Message, ToolCallInfo } from '../../models';
import { marked } from 'marked';

export interface MapLocation {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
}

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
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <mat-icon class="header-icon">chat_bubble</mat-icon>
        <div class="header-titles">
          <h2>OLIMA Assistant</h2>
          <span class="active-org-name" *ngIf="currentOrgName">{{ currentOrgName }}</span>
        </div>
        <span class="spacer"></span>

        <!-- Debug Mode Toggle Button -->
        <button mat-stroked-button 
                class="header-btn debug-btn" 
                [class.debug-active]="debugMode" 
                (click)="toggleDebugMode()"
                [matTooltip]="debugMode ? 'Debug Mode is ON: Tool executions visible' : 'Debug Mode is OFF: Tool executions hidden'">
          <mat-icon class="btn-icon">{{ debugMode ? 'bug_report' : 'check_circle' }}</mat-icon>
          <span>Debug: {{ debugMode ? 'ON' : 'OFF' }}</span>
        </button>

        <!-- New Chat Button -->
        <button mat-stroked-button 
                class="header-btn new-chat-btn" 
                (click)="startNewChat()" 
                matTooltip="Start a fresh conversation">
          <mat-icon class="btn-icon">add</mat-icon>
          <span>New Chat</span>
        </button>

        <!-- History Menu Button -->
        <button mat-stroked-button 
                class="header-btn history-btn" 
                [matMenuTriggerFor]="historyMenu" 
                (click)="loadRecentConversations()"
                matTooltip="View previous conversations">
          <mat-icon class="btn-icon">history</mat-icon>
          <span>History</span>
        </button>
        <mat-menu #historyMenu="matMenu" class="history-menu">
          <div class="menu-title-header">Recent Conversations</div>
          <button mat-menu-item *ngFor="let c of recentConversations" (click)="selectConversation(c)">
            <mat-icon color="primary">forum</mat-icon>
            <span class="history-item-title">{{ c.title || 'Conversation ' + (c.createdAt | date:'shortDate') }}</span>
          </button>
          <div *ngIf="recentConversations.length === 0" class="empty-history-item">
            No previous conversations.
          </div>
        </mat-menu>

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
          
          <!-- Tool call info: ONLY displayed if debugMode is ON -->
          <div *ngIf="debugMode && msg.role === 'TOOL_INFO'" class="tool-container">
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

            <!-- Interactive Map Card (if coordinates detected) -->
            <div *ngIf="getLocations(msg).length > 0" class="maps-container">
              <div *ngFor="let loc of getLocations(msg)" class="map-card">
                <div class="map-header">
                  <div class="map-header-left">
                    <mat-icon class="map-pin-icon">place</mat-icon>
                    <div class="map-title-group">
                      <span class="map-title">{{ loc.title || 'Joylashuv xaritasi' }}</span>
                      <span class="map-address" *ngIf="loc.address">{{ loc.address }}</span>
                    </div>
                  </div>
                  
                  <div class="map-header-right">
                    <div class="coords-badge" 
                         (click)="copyCoordinates(loc.lat + ', ' + loc.lng)" 
                         [matTooltip]="copiedCoord === (loc.lat + ', ' + loc.lng) ? 'Nusxalandi!' : 'Koordinatani nusxalash'">
                      <span>📍 {{ loc.lat | number:'1.4-6' }}, {{ loc.lng | number:'1.4-6' }}</span>
                      <mat-icon class="copy-small-icon">{{ copiedCoord === (loc.lat + ', ' + loc.lng) ? 'check' : 'content_copy' }}</mat-icon>
                    </div>

                    <a [href]="'https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng" 
                       target="_blank" 
                       mat-stroked-button 
                       class="map-nav-btn"
                       matTooltip="Google Maps'da ochish">
                      <mat-icon class="nav-icon">map</mat-icon>
                      <span>Google</span>
                    </a>
                    
                    <a [href]="'https://yandex.com/maps/?text=' + loc.lat + ',' + loc.lng" 
                       target="_blank" 
                       mat-stroked-button 
                       class="map-nav-btn"
                       matTooltip="Yandex Maps'da ochish">
                      <mat-icon class="nav-icon">navigation</mat-icon>
                      <span>Yandex</span>
                    </a>
                  </div>
                </div>

                <div class="map-viewport">
                  <iframe
                    class="map-iframe"
                    [src]="getSafeMapUrl(loc.lat, loc.lng)"
                    loading="lazy"
                    title="Xarita">
                  </iframe>
                </div>
              </div>
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

    .header-btn {
      color: white !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      font-size: 12px !important;
      height: 36px !important;
      padding: 0 10px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 8px !important;
      transition: all 0.2s ease;
    }
    .header-btn:hover {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    .debug-btn {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    .debug-active {
      background: #ff9800 !important;
      color: #1a237e !important;
      font-weight: 600 !important;
      border-color: #ff9800 !important;
    }
    .new-chat-btn {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    .history-btn {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    .btn-icon {
      font-size: 16px !important;
      height: 16px !important;
      width: 16px !important;
      margin-right: 2px !important;
    }
    .menu-title-header {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #718096;
      border-bottom: 1px solid #edf2f7;
    }
    .history-item-title {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty-history-item {
      padding: 12px 16px;
      font-size: 13px;
      color: #a0aec0;
      font-style: italic;
    }

    .student-input { width: 170px; }
    ::ng-deep .student-input .mat-mdc-text-field-wrapper { background-color: rgba(255,255,255,0.1) !important; }
    ::ng-deep .student-input input { color: white !important; font-size: 13px !important; }
    ::ng-deep .student-input .mat-mdc-form-field-focus-overlay { background-color: transparent; }
    ::ng-deep .student-input mat-label { color: rgba(255,255,255,0.7) !important; font-size: 12px !important; }

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
    
    /* Modern UI Table Styles */
    .markdown-content ::ng-deep .ui-table-container {
      margin: 16px 0;
      border-radius: 10px;
      border: 1px solid #d0d7de;
      overflow: hidden;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
      background: #ffffff;
    }
    .markdown-content ::ng-deep .ui-table-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .markdown-content ::ng-deep .ui-table-scroll {
      width: 100%;
      overflow-x: auto;
    }
    .markdown-content ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      line-height: 1.5;
      text-align: left;
      margin: 0;
    }
    .markdown-content ::ng-deep thead {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: #ffffff;
    }
    .markdown-content ::ng-deep th {
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 2px solid #0d1b2a;
      white-space: nowrap;
      letter-spacing: 0.3px;
      font-size: 13px;
    }
    .markdown-content ::ng-deep td {
      padding: 10px 16px;
      border-bottom: 1px solid #e2e8f0;
      color: #2d3748;
    }
    .markdown-content ::ng-deep tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .markdown-content ::ng-deep tbody tr:hover {
      background-color: #edf2f6;
      transition: background-color 0.15s ease-in-out;
    }
    .markdown-content ::ng-deep tbody tr:last-child td {
      border-bottom: none;
    }

    /* Interactive Map Styles */
    .maps-container {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      min-width: 320px;
    }
    .map-card {
      background: #ffffff;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(26, 35, 126, 0.08);
      transition: box-shadow 0.2s ease;
    }
    .map-card:hover {
      box-shadow: 0 6px 16px rgba(26, 35, 126, 0.12);
    }
    .map-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 10px;
      flex-wrap: wrap;
    }
    .map-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .map-pin-icon {
      color: #e53935;
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .map-title-group {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .map-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .map-address {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .map-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .coords-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s;
    }
    .coords-badge:hover {
      background: #dbeafe;
    }
    .copy-small-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .map-nav-btn {
      font-size: 11.5px !important;
      height: 28px !important;
      padding: 0 8px !important;
      line-height: 28px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 6px !important;
      color: #334155 !important;
      border-color: #cbd5e1 !important;
      background: white !important;
      text-decoration: none !important;
    }
    .map-nav-btn:hover {
      background: #f1f5f9 !important;
      color: #1a237e !important;
    }
    .nav-icon {
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      color: #1a237e;
    }
    .map-viewport {
      position: relative;
      width: 100%;
      height: 260px;
      background: #e2e8f0;
    }
    .map-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    
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
  debugMode = false;
  recentConversations: Conversation[] = [];

  private isReloading = false;
  private routerSubscription?: Subscription;

  private beforeUnloadHandler = () => {
    this.isReloading = true;
  };

  private orgChangeListener = () => {
    this.startNewChat();
    this.loadCurrentOrg();
  };

  copiedCoord?: string;
  private messageLocationsCache = new Map<string, MapLocation[]>();
  private sanitizedMapUrlCache = new Map<string, SafeResourceUrl>();

  constructor(
    private apiService: ApiService, 
    private cdr: ChangeDetectorRef,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.debugMode = localStorage.getItem('olima_debug_mode') === 'true';

    // 1. Restore conversation state on browser refresh (F5)
    const savedConvId = sessionStorage.getItem('olima_active_chat_conv_id');
    const savedMessages = sessionStorage.getItem('olima_active_chat_messages');
    if (savedConvId && savedMessages) {
      try {
        this.conversationId = savedConvId;
        this.messages = JSON.parse(savedMessages);
      } catch (e) {
        console.error('Failed to parse saved chat session', e);
      }
    }

    this.loadCurrentOrg();
    this.loadRecentConversations();

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    window.addEventListener('orgChanged', this.orgChangeListener);

    // 2. Listen to router navigation: if user navigates to another page, clear the chat session
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: any) => {
      if (!this.isReloading && event.url && !event.url.startsWith('/chat')) {
        sessionStorage.removeItem('olima_active_chat_conv_id');
        sessionStorage.removeItem('olima_active_chat_messages');
      }
    });

    this.scrollToBottom();
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    window.removeEventListener('orgChanged', this.orgChangeListener);
    this.routerSubscription?.unsubscribe();

    // If navigating away in SPA, clear session so re-entry starts fresh
    if (!this.isReloading) {
      sessionStorage.removeItem('olima_active_chat_conv_id');
      sessionStorage.removeItem('olima_active_chat_messages');
    }
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    localStorage.setItem('olima_debug_mode', String(this.debugMode));
  }

  startNewChat(): void {
    this.conversationId = undefined;
    this.messages = [];
    sessionStorage.removeItem('olima_active_chat_conv_id');
    sessionStorage.removeItem('olima_active_chat_messages');
    this.loadRecentConversations();
  }

  saveChatState(): void {
    if (this.conversationId) {
      sessionStorage.setItem('olima_active_chat_conv_id', this.conversationId);
      sessionStorage.setItem('olima_active_chat_messages', JSON.stringify(this.messages));
    }
  }

  loadRecentConversations(): void {
    const orgId = localStorage.getItem('selectedOrgId');
    if (orgId) {
      this.apiService.getConversations(orgId).subscribe({
        next: (convs) => {
          this.recentConversations = convs || [];
        },
        error: () => {}
      });
    }
  }

  selectConversation(conv: Conversation): void {
    if (!conv || !conv.id) return;
    this.loading = true;
    this.apiService.getConversation(conv.id).subscribe({
      next: (fullConv) => {
        this.conversationId = fullConv.id;
        this.messages = (fullConv.messages || [])
          .filter(m => m.role === 'USER' || m.role === 'ASSISTANT')
          .map(m => ({
            role: m.role as 'USER' | 'ASSISTANT',
            content: m.content
          }));
        this.loading = false;
        this.saveChatState();
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to load conversation', err);
        this.loading = false;
      }
    });
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

  getLocations(msg: DisplayMessage): MapLocation[] {
    if (!msg.content || msg.role !== 'ASSISTANT') return [];
    if (this.messageLocationsCache.has(msg.content)) {
      return this.messageLocationsCache.get(msg.content)!;
    }
    const locs = this.extractLocations(msg.content);
    this.messageLocationsCache.set(msg.content, locs);
    return locs;
  }

  getSafeMapUrl(lat: number, lng: number): SafeResourceUrl {
    const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
    if (this.sanitizedMapUrlCache.has(key)) {
      return this.sanitizedMapUrlCache.get(key)!;
    }
    const delta = 0.007;
    const minLng = (lng - delta).toFixed(5);
    const minLat = (lat - delta).toFixed(5);
    const maxLng = (lng + delta).toFixed(5);
    const maxLat = (lat + delta).toFixed(5);
    const bbox = `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.sanitizedMapUrlCache.set(key, safeUrl);
    return safeUrl;
  }

  copyCoordinates(coordText: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(coordText).then(() => {
        this.copiedCoord = coordText;
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.copiedCoord === coordText) {
            this.copiedCoord = undefined;
            this.cdr.detectChanges();
          }
        }, 2000);
      });
    }
  }

  private extractLocations(content: string): MapLocation[] {
    if (!content) return [];
    const locations: MapLocation[] = [];
    const seen = new Set<string>();

    const addLocation = (lat: number, lng: number, title?: string, address?: string) => {
      if (isNaN(lat) || isNaN(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        locations.push({ lat, lng, title, address });
      }
    };

    // 1. JSON block ```map or ```geo or ```json containing lat/lng
    const codeBlockRegex = /```(?:map|geo|json)?\s*(\{[\s\S]*?\})\s*```/gi;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const lat = Number(parsed.lat ?? parsed.latitude);
        const lng = Number(parsed.lng ?? parsed.lon ?? parsed.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          addLocation(lat, lng, parsed.title || parsed.name, parsed.address || parsed.description);
        }
      } catch (_) {}
    }

    // 2. Labeled coordinates: lat: 41.123, lng: 69.123 or kenglik / uzunlik
    const labeledRegex = /(?:lat(?:itude)?|kenglik)\s*[:=]\s*([+-]?\d{1,2}(?:\.\d+)?)[,\s]+(?:lon(?:gitude)?|lng|uzunlik)\s*[:=]\s*([+-]?\d{1,3}(?:\.\d+)?)/gi;
    while ((match = labeledRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    // 3. Bracketed coordinates: [41.3409, 69.2867] or (41.3409, 69.2867)
    const bracketedRegex = /[\[\(]([+-]?\d{1,2}\.\d{3,8})[,\s]+([+-]?\d{1,3}\.\d{3,8})[\]\)]/g;
    while ((match = bracketedRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    // 4. Coordinates preceded by keywords: koordinata, lokatsiya, location, geo, xarita, manzil
    const keywordRegex = /(?:koordinata|lokatsiya|location|geo|xarita|manzil)[^\n\d]*?([+-]?\d{1,2}\.\d{3,8})[,\s]+([+-]?\d{1,3}\.\d{3,8})/gi;
    while ((match = keywordRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    // 5. Standalone coordinates with 4+ decimal places
    if (locations.length === 0) {
      const generalCoordRegex = /\b([+-]?\d{1,2}\.\d{4,8})[,\s]+([+-]?\d{1,3}\.\d{4,8})\b/g;
      while ((match = generalCoordRegex.exec(content)) !== null) {
        addLocation(parseFloat(match[1]), parseFloat(match[2]));
      }
    }

    return locations;
  }

  renderMarkdown(text: string): string {
    if (!text) return '';
    // Clean out ```map or ```geo code blocks from markdown text so raw JSON isn't displayed as code
    const cleanedText = text.replace(/```(?:map|geo)\s*\{[\s\S]*?\}\s*```/gi, '');
    let html = marked.parse(cleanedText) as string;

    // Automatically wrap HTML tables in responsive modern UI container
    html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (match) => {
      return `<div class="ui-table-container"><div class="ui-table-header"><span class="ui-table-icon">📊</span><span class="ui-table-title">Jadval</span></div><div class="ui-table-scroll">${match}</div></div>`;
    });

    return html;
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
    this.saveChatState();

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
            this.saveChatState();
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
          this.saveChatState();
          this.loadRecentConversations();
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
          this.saveChatState();
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
        this.saveChatState();
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        this.loading = false;
        if (assistantMsg) {
          assistantMsg.isStreaming = false;
        }
        this.saveChatState();
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
        this.saveChatState();
      },
      error: () => {
        this.messages.push({ role: 'ASSISTANT', content: 'Error confirming action.' });
        this.loading = false;
        this.saveChatState();
      }
    });
  }

  cancelConfirmation() {
    this.messages.push({ role: 'USER', content: 'Action Cancelled.' });
    this.messages.push({ role: 'ASSISTANT', content: 'The action has been cancelled.' });
    this.saveChatState();
  }
}
