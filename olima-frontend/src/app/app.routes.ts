import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { superAdminGuard } from './guards/super-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'organizations',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./pages/organizations/organizations.component').then(m => m.OrganizationsComponent)
  },
  {
    path: 'organizations/:id/tools',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tools/tools.component').then(m => m.ToolsComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
  },
  {
    path: 'tools',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tools/tools.component').then(m => m.ToolsComponent)
  },
  {
    path: 'tools/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tool-detail/tool-detail.component').then(m => m.ToolDetailComponent)
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent)
  },
  {
    path: 'conversations',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent)
  },
  {
    path: 'conversations/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/conversation-detail/conversation-detail.component').then(m => m.ConversationDetailComponent)
  },
  {
    path: 'executions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/executions/executions.component').then(m => m.ExecutionsComponent)
  },
  {
    path: 'complaints',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/complaints/complaints.component').then(m => m.ComplaintsComponent)
  },
  {
    path: 'knowledge',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/knowledge/knowledge.component').then(m => m.KnowledgeComponent)
  },
  {
    path: 'knowledge/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/knowledge/knowledge-detail.component').then(m => m.KnowledgeDetailComponent)
  }
];
