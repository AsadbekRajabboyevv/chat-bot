import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Organization,
  Tool,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  Conversation,
  Execution,
  Complaint,
  KnowledgeBase
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api/v1';

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.baseUrl}/organizations`);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/organizations/${id}`);
  }

  createOrganization(data: any): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations`, data);
  }

  updateOrganization(id: string, data: any): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/organizations/${id}`, data);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organizations/${id}`);
  }

  getTools(orgId: string): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.baseUrl}/tools?organizationId=${orgId}`);
  }

  getTool(id: string): Observable<Tool> {
    return this.http.get<Tool>(`${this.baseUrl}/tools/${id}`);
  }

  createTool(orgId: string, data: any): Observable<Tool> {
    return this.http.post<Tool>(`${this.baseUrl}/tools?organizationId=${orgId}`, data);
  }

  updateTool(id: string, data: any): Observable<Tool> {
    return this.http.put<Tool>(`${this.baseUrl}/tools/${id}`, data);
  }

  deleteTool(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tools/${id}`);
  }

  toggleTool(id: string, enabled: boolean): Observable<Tool> {
    return this.http.patch<Tool>(`${this.baseUrl}/tools/${id}/toggle?enabled=${enabled}`, { enabled });
  }

  chat(data: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, data);
  }

  chatStream(data: ChatRequest): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>(observer => {
      const controller = new AbortController();

      fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json, */*'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })
      .then(async response => {
        if (!response.ok) {
          const errText = await response.text();
          let message = `HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errText);
            message = errJson.message || message;
          } catch (e) {
            if (errText) message = errText;
          }
          throw new Error(message);
        }
        if (!response.body) {
          throw new Error('ReadableStream not supported.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              if (dataStr) {
                try {
                  const event: ChatStreamEvent = JSON.parse(dataStr);
                  this.ngZone.run(() => observer.next(event));
                } catch (e) {
                  console.error('Failed to parse SSE JSON data:', dataStr, e);
                }
              }
            }
          }
        }

        this.ngZone.run(() => observer.complete());
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          this.ngZone.run(() => observer.error(err));
        }
      });

      return () => {
        controller.abort();
      };
    });
  }

  confirmAction(conversationId: string, complaintId: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat/confirm`, { conversationId, complaintId });
  }

  getConversations(orgId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/conversations?organizationId=${orgId}`);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/conversations/${id}`);
  }

  getExecutions(orgId: string): Observable<Execution[]> {
    return this.http.get<Execution[]>(`${this.baseUrl}/executions?organizationId=${orgId}`);
  }

  getComplaints(orgId: string): Observable<Complaint[]> {
    return this.http.get<Complaint[]>(`${this.baseUrl}/complaints?organizationId=${orgId}`);
  }

  confirmComplaint(id: string): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.baseUrl}/complaints/${id}/confirm`, {});
  }

  getKnowledgeBases(orgId: string): Observable<KnowledgeBase[]> {
    return this.http.get<KnowledgeBase[]>(`${this.baseUrl}/knowledge/bases?organizationId=${orgId}`);
  }
}
