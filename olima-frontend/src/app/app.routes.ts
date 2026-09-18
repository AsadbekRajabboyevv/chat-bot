import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  { 
    path: 'organizations', 
    loadComponent: () => import('./pages/organizations/organizations.component').then(m => m.OrganizationsComponent)
  },
  { 
    path: 'organizations/:id/tools', 
    loadComponent: () => import('./pages/tools/tools.component').then(m => m.ToolsComponent)
  },
  { 
    path: 'tools', 
    loadComponent: () => import('./pages/tools/tools.component').then(m => m.ToolsComponent)
  },
  { 
    path: 'tools/:id', 
    loadComponent: () => import('./pages/tool-detail/tool-detail.component').then(m => m.ToolDetailComponent)
  },
  { 
    path: 'chat', 
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent)
  },
  { 
    path: 'conversations', 
    loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent)
  },
  { 
    path: 'conversations/:id', 
    loadComponent: () => import('./pages/conversation-detail/conversation-detail.component').then(m => m.ConversationDetailComponent)
  },
  { 
    path: 'executions', 
    loadComponent: () => import('./pages/executions/executions.component').then(m => m.ExecutionsComponent)
  },
  { 
    path: 'complaints', 
    loadComponent: () => import('./pages/complaints/complaints.component').then(m => m.ComplaintsComponent)
  },
  {
    path: 'knowledge',
    loadComponent: () => import('./pages/knowledge/knowledge.component').then(m => m.KnowledgeComponent)
  },
  {
    path: 'knowledge/:id',
    loadComponent: () => import('./pages/knowledge/knowledge-detail.component').then(m => m.KnowledgeDetailComponent)
  }
];
