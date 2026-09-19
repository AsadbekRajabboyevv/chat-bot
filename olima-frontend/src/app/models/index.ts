export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  /** Widget saytga qo'yilganda shu kalit yuboriladi; tashkilot server tomonda aniqlanadi. */
  widgetKey?: string;
  /** Mijoz saytida logo ustida chiqadigan salomlashish; bo'sh bo'lsa widget standart matnni oladi. */
  widgetGreeting?: string | null;
  widgetGreetingEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: 'REST_API' | 'RAG' | 'DATABASE' | 'WORKFLOW';
  configuration: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  accessLevel: 'READ' | 'WRITE' | 'SENSITIVE';
  parameters: ToolParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface ToolParameter {
  id?: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface ChatRequest {
  organizationId: string;
  conversationId?: string;
  message: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  toolCalls: ToolCallInfo[];
  sources: string[];
  confirmationRequired: boolean;
  pendingComplaintId?: string;
}

export interface ToolCallInfo {
  toolName: string;
  input: string;
  output: string;
  status: string;
  durationMs: number;
}

export interface ChatStreamEvent {
  type: 'INIT' | 'TOOL_CALL' | 'CONTENT' | 'COMPLETE' | 'ERROR';
  content?: string;
  toolCall?: ToolCallInfo;
  sources?: string[];
  conversationId?: string;
  confirmationRequired?: boolean;
  pendingComplaintId?: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'TOOL' | 'SYSTEM';
  content: string;
  toolCallId?: string;
  toolName?: string;
  createdAt: string;
}

export interface Execution {
  id: string;
  organizationId: string;
  conversationId: string;
  toolId: string;
  toolName: string;
  input: string;
  output: string;
  status: string;
  durationMs: number;
  createdAt: string;
}

export interface Complaint {
  id: string;
  organizationId: string;
  conversationId: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content?: string;
  sourceUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  enabled: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  organizationId?: string;
}
