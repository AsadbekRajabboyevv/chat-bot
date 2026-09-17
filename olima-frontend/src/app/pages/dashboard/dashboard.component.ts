import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      
      <div class="stats-grid">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">business</mat-icon>
            <mat-card-title>Organizations</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ orgCount }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">build</mat-icon>
            <mat-card-title>Tools</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ toolCount }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">forum</mat-icon>
            <mat-card-title>Recent Conversations</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-value">{{ convCount }}</div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="actions-section">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <button mat-raised-button color="primary" routerLink="/chat">
            <mat-icon>chat</mat-icon> Start Chat
          </button>
          <button mat-raised-button color="accent" routerLink="/organizations">
            <mat-icon>business</mat-icon> Manage Organizations
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    .stat-value {
      font-size: 3rem;
      font-weight: 300;
      text-align: center;
      padding: 16px 0;
    }
    mat-icon[mat-card-avatar] {
      font-size: 40px;
      height: 40px;
      width: 40px;
    }
    .actions-section {
      margin-top: 32px;
    }
    .actions-grid {
      display: flex;
      gap: 16px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  orgCount = 0;
  toolCount = 0;
  convCount = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.apiService.getOrganizations().subscribe(orgs => {
      this.orgCount = orgs.length;
      if (orgs.length > 0) {
        this.apiService.getTools(orgs[0].id).subscribe(tools => this.toolCount = tools.length);
        this.apiService.getConversations(orgs[0].id).subscribe(convs => this.convCount = convs.length);
      }
    });
  }
}
