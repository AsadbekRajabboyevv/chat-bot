import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { Organization } from './models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  template: `
    <router-outlet *ngIf="isAuthPage"></router-outlet>

    <mat-sidenav-container class="sidenav-container" *ngIf="!isAuthPage">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <mat-icon>smart_toy</mat-icon>
          <h2>OLIMA</h2>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <div matListItemTitle>Boshqaruv paneli</div>
          </a>
          <a mat-list-item routerLink="/chat" routerLinkActive="active">
            <mat-icon matListItemIcon>chat</mat-icon>
            <div matListItemTitle>Chat</div>
          </a>
          <a mat-list-item routerLink="/organizations" routerLinkActive="active" *ngIf="isSuperAdmin">
            <mat-icon matListItemIcon>business</mat-icon>
            <div matListItemTitle>Tashkilotlar</div>
          </a>
          <a mat-list-item routerLink="/users" routerLinkActive="active" *ngIf="isSuperAdmin">
            <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
            <div matListItemTitle>Adminlar</div>
          </a>
          <a mat-list-item routerLink="/tools" routerLinkActive="active">
            <mat-icon matListItemIcon>build</mat-icon>
            <div matListItemTitle>Vositalar boshqaruvi</div>
          </a>
          <a mat-list-item routerLink="/conversations" routerLinkActive="active">
            <mat-icon matListItemIcon>forum</mat-icon>
            <div matListItemTitle>Suhbatlar</div>
          </a>
          <a mat-list-item routerLink="/executions" routerLinkActive="active">
            <mat-icon matListItemIcon>history</mat-icon>
            <div matListItemTitle>Bajarilgan amallar</div>
          </a>
          <a mat-list-item routerLink="/complaints" routerLinkActive="active">
            <mat-icon matListItemIcon>report_problem</mat-icon>
            <div matListItemTitle>Murojaatlar</div>
          </a>
          <a mat-list-item routerLink="/knowledge" routerLinkActive="active">
            <mat-icon matListItemIcon>library_books</mat-icon>
            <div matListItemTitle>Bilimlar bazasi</div>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span>OLIMA Boshqaruv Paneli</span>
          <span class="spacer"></span>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="org-selector"
                           *ngIf="isSuperAdmin && organizations.length > 0">
            <mat-select [(ngModel)]="selectedOrgId" (selectionChange)="onOrgChange($event.value)" placeholder="Tashkilotni tanlang">
              <mat-option *ngFor="let org of organizations" [value]="org.id">
                {{ org.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <span class="org-name-display" *ngIf="!isSuperAdmin && organizations.length > 0">
            {{ organizations[0].name }}
          </span>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-user-info">
              <strong>{{ currentUsername }}</strong>
              <span>{{ isSuperAdmin ? 'Super admin' : 'Tashkilot admini' }}</span>
            </div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Chiqish</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="content-wrapper">
          <div class="loading-screen" *ngIf="!orgsLoaded">
            <mat-spinner diameter="40"></mat-spinner>
            <span>Yuklanmoqda...</span>
          </div>
          <router-outlet *ngIf="orgsLoaded"></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    .sidenav {
      width: 250px;
      background-color: #ffffff;
      box-shadow: 2px 0 5px rgba(0,0,0,0.05);
    }
    .sidenav-header {
      padding: 24px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: #1a237e;
      color: white;
    }
    .sidenav-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }
    .active {
      background-color: rgba(0, 0, 0, 0.04);
      color: #1a237e;
    }
    .active mat-icon {
      color: #1a237e;
    }
    .toolbar {
      background-color: #1a237e;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 2;
      position: relative;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .org-selector {
      width: 250px;
      margin-right: 16px;
    }
    ::ng-deep .org-selector .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }
    ::ng-deep .org-selector .mat-mdc-select-value-text {
      color: white !important;
    }
    ::ng-deep .org-selector .mat-mdc-select-arrow {
      color: white !important;
    }
    .org-name-display {
      margin-right: 16px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
    }
    .user-menu-btn {
      color: white;
    }
    .menu-user-info {
      display: flex;
      flex-direction: column;
      padding: 8px 16px;
      border-bottom: 1px solid #edf2f7;
      margin-bottom: 4px;
    }
    .menu-user-info strong {
      font-size: 14px;
      color: #1a237e;
    }
    .menu-user-info span {
      font-size: 12px;
      color: #718096;
    }
    .content-wrapper {
      padding: 24px;
      height: calc(100vh - 64px - 48px);
      overflow-y: auto;
    }
    .loading-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      height: 100%;
      color: #64748b;
      font-size: 14px;
    }
  `]
})
export class AppComponent implements OnInit {
  organizations: Organization[] = [];
  selectedOrgId: string | null = null;
  isAuthPage = false;
  orgsLoaded = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get currentUsername(): string {
    return this.authService.getCurrentUser()?.username || '';
  }

  ngOnInit(): void {
    this.isAuthPage = this.router.url.startsWith('/login');

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e) => {
      this.isAuthPage = (e as NavigationEnd).urlAfterRedirects.startsWith('/login');
      if (!this.isAuthPage && this.authService.isAuthenticated() && this.organizations.length === 0) {
        this.loadOrganizations();
      }
    });

    if (this.authService.isAuthenticated()) {
      this.loadOrganizations();
    }

    window.addEventListener('orgChanged', () => {
      this.loadOrganizations(false);
    });
  }

  loadOrganizations(resetSelection = true): void {
    this.apiService.getOrganizations().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
        const saved = localStorage.getItem('selectedOrgId');
        if (saved && orgs.some(o => o.id === saved)) {
          this.selectedOrgId = saved;
        } else if (orgs.length > 0 && resetSelection) {
          this.selectedOrgId = orgs[0].id;
          localStorage.setItem('selectedOrgId', this.selectedOrgId);
        }
        this.orgsLoaded = true;
      },
      error: () => {
        // Don't block the whole app behind a spinner forever if this call fails once.
        this.orgsLoaded = true;
      }
    });
  }

  onOrgChange(orgId: string): void {
    this.selectedOrgId = orgId;
    localStorage.setItem('selectedOrgId', orgId);
    window.dispatchEvent(new Event('orgChanged'));
  }

  logout(): void {
    this.authService.logout();
  }
}
