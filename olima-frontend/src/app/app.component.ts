import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';
import { BrandLoaderComponent } from './components/brand-loader.component';
import { Organization } from './models';
import { FormsModule } from '@angular/forms';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  superOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    BrandLoaderComponent,
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
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <router-outlet *ngIf="isAuthPage"></router-outlet>

    <div class="shell" *ngIf="!isAuthPage" [class.shell--collapsed]="collapsed">
      <!-- ============ Yon panel ============ -->
      <aside class="nav">
        <a class="brand" routerLink="/dashboard">
          <img src="assets/logo-96.png" alt="OLIMA AI" class="brand__logo">
          <span class="brand__text">
            <span class="brand__name">OLIMA AI</span>
            <span class="brand__sub">boshqaruv paneli</span>
          </span>
        </a>

        <nav class="nav__scroll">
          <ng-container *ngFor="let group of navGroups">
            <div class="nav__group" *ngIf="visible(group).length">
              <div class="nav__label">{{ group.title }}</div>
              <a *ngFor="let item of visible(group)"
                 class="nav__item"
                 [routerLink]="item.path"
                 routerLinkActive="is-active"
                 [matTooltip]="collapsed ? item.label : ''"
                 matTooltipPosition="right">
                <mat-icon>{{ item.icon }}</mat-icon>
                <span class="nav__text">{{ item.label }}</span>
              </a>
            </div>
          </ng-container>
        </nav>

        <div class="nav__foot">
          <button class="nav__collapse" (click)="collapsed = !collapsed"
                  [matTooltip]="collapsed ? 'Yoyish' : 'Yig\\'ish'" matTooltipPosition="right">
            <mat-icon>{{ collapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
            <span class="nav__text">Yig'ish</span>
          </button>
        </div>
      </aside>

      <!-- ============ Asosiy ustun ============ -->
      <div class="main">
        <header class="bar">
          <div class="bar__left">
            <span class="bar__crumb">{{ pageTitle }}</span>
          </div>

          <div class="bar__right">
            <div class="org-pick" *ngIf="isSuperAdmin && organizations.length > 0">
              <mat-icon class="org-pick__icon">apartment</mat-icon>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="org-pick__field">
                <mat-select [(ngModel)]="selectedOrgId" (selectionChange)="onOrgChange($event.value)"
                            placeholder="Tashkilot">
                  <mat-option *ngFor="let org of organizations" [value]="org.id">{{ org.name }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="org-fixed" *ngIf="!isSuperAdmin && organizations.length > 0">
              <mat-icon>apartment</mat-icon>
              <span class="truncate">{{ organizations[0].name }}</span>
            </div>

            <button class="who" [matMenuTriggerFor]="userMenu">
              <span class="who__ava">{{ initials }}</span>
              <span class="who__meta">
                <span class="who__name">{{ currentUsername }}</span>
                <span class="who__role">{{ isSuperAdmin ? 'Super admin' : 'Tashkilot admini' }}</span>
              </span>
              <mat-icon class="who__caret">expand_more</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu" xPosition="before">
              <div class="menu-head">
                <strong>{{ currentUsername }}</strong>
                <span>{{ isSuperAdmin ? 'Super admin' : 'Tashkilot admini' }}</span>
              </div>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Chiqish</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <div class="content">
          <router-outlet *ngIf="orgsLoaded"></router-outlet>
        </div>
        <app-brand-loader *ngIf="!orgsLoaded || loading.visible()"></app-brand-loader>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: var(--nav-w) 1fr;
      height: 100vh;
      transition: grid-template-columns .2s ease;
    }
    .shell--collapsed { grid-template-columns: 76px 1fr; }

    /* ---------- yon panel (to'q) ---------- */
    .nav {
      position: relative;
      background: linear-gradient(185deg, #241f5c 0%, #1e1b4b 42%, #191734 100%);
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    /* yumshoq binafsha nur — yassi ko'rinmasligi uchun */
    .nav::after {
      content: '';
      position: absolute;
      width: 300px; height: 300px;
      top: -110px; left: -90px;
      background: #7c3aed;
      filter: blur(90px);
      opacity: .38;
      pointer-events: none;
    }
    .nav > * { position: relative; z-index: 1; }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      height: var(--bar-h);
      padding: 0 18px;
      border-bottom: 1px solid rgba(255,255,255,.09);
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand__logo {
      width: 32px; height: 32px;
      border-radius: 9px;
      flex-shrink: 0;
      object-fit: contain;
      background: rgba(255,255,255,.1);
      padding: 3px;
    }
    .brand__text { display: flex; flex-direction: column; min-width: 0; }
    .brand__name {
      font-size: 15px; font-weight: 700; color: #fff;
      letter-spacing: -0.01em; line-height: 18px; white-space: nowrap;
    }
    .brand__sub {
      font-size: 10.5px; color: rgba(255,255,255,.46); letter-spacing: .04em;
      text-transform: uppercase; line-height: 14px; white-space: nowrap;
    }

    .nav__scroll { flex: 1 1 auto; overflow-y: auto; padding: 14px 12px 8px; }
    .nav__scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-color: transparent; }

    .nav__group { margin-bottom: 18px; }

    .nav__label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .07em;
      text-transform: uppercase;
      color: rgba(255,255,255,.38);
      padding: 0 10px 7px;
      white-space: nowrap;
    }

    .nav__item {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 40px;
      padding: 0 10px;
      border-radius: 10px;
      color: rgba(255,255,255,.72);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 550;
      white-space: nowrap;
      transition: background .14s ease, color .14s ease;
      position: relative;
    }
    .nav__item mat-icon {
      font-size: 20px; width: 20px; height: 20px;
      color: rgba(255,255,255,.5);
      flex-shrink: 0;
      transition: color .14s ease;
    }
    .nav__item:hover { background: rgba(255,255,255,.07); color: #fff; }
    .nav__item:hover mat-icon { color: rgba(255,255,255,.8); }

    .nav__item.is-active {
      background: linear-gradient(90deg, rgba(129,140,248,.26) 0%, rgba(168,85,247,.14) 100%);
      color: #fff;
      font-weight: 650;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
    }
    .nav__item.is-active mat-icon { color: #c7d2fe; }
    .nav__item.is-active::before {
      content: '';
      position: absolute;
      left: -12px; top: 9px; bottom: 9px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, #818cf8, #a855f7);
    }

    .nav__foot { padding: 10px 12px 14px; border-top: 1px solid rgba(255,255,255,.09); }
    .nav__collapse {
      display: flex; align-items: center; gap: 12px;
      width: 100%; height: 38px; padding: 0 10px;
      border: none; background: transparent; cursor: pointer;
      border-radius: 10px; color: rgba(255,255,255,.55);
      font-size: 13px; font-weight: 550; font-family: inherit;
    }
    .nav__collapse:hover { background: rgba(255,255,255,.07); color: #fff; }
    .nav__collapse mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .shell--collapsed .nav__text,
    .shell--collapsed .brand__text,
    .shell--collapsed .nav__label { display: none; }
    .shell--collapsed .nav__item,
    .shell--collapsed .nav__collapse { justify-content: center; padding: 0; }
    .shell--collapsed .brand { justify-content: center; padding: 0; }
    .shell--collapsed .nav__group { margin-bottom: 10px; }

    /* ---------- yuqori panel ---------- */
    .main { display: flex; flex-direction: column; min-width: 0; position: relative; }
    /* loader faqat kontentni yopadi — sarlavha va tashkilot tanlagich ishlayveradi */
    .main > app-brand-loader { top: var(--bar-h, 64px); }

    .bar {
      height: var(--bar-h);
      flex-shrink: 0;
      background: rgba(255,255,255,.86);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--edge);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 22px 0 28px;
      position: sticky; top: 0; z-index: 10;
    }

    .bar__crumb { font-size: 15px; font-weight: 650; color: var(--ink); letter-spacing: -0.01em; }
    .bar__right { display: flex; align-items: center; gap: 12px; }

    .org-pick { display: flex; align-items: center; gap: 8px; }
    .org-pick__icon { font-size: 19px; width: 19px; height: 19px; color: var(--ink-4); }
    .org-pick__field { width: 228px; }
    ::ng-deep .org-pick__field .mat-mdc-text-field-wrapper { background: #f6f7fb; }
    ::ng-deep .org-pick__field .mdc-notched-outline__leading,
    ::ng-deep .org-pick__field .mdc-notched-outline__notch,
    ::ng-deep .org-pick__field .mdc-notched-outline__trailing { border-color: var(--edge) !important; }

    .org-fixed {
      display: flex; align-items: center; gap: 7px;
      max-width: 240px;
      height: 36px; padding: 0 12px;
      background: #f6f7fb; border: 1px solid var(--edge);
      border-radius: 10px;
      font-size: 13px; font-weight: 600; color: var(--ink-2);
    }
    .org-fixed mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--ink-4); }

    .who {
      display: flex; align-items: center; gap: 9px;
      height: 40px; padding: 0 8px 0 6px;
      border: 1px solid transparent; background: transparent;
      border-radius: 11px; cursor: pointer; font-family: inherit;
      transition: background .14s ease, border-color .14s ease;
    }
    .who:hover { background: #f5f7fb; border-color: var(--edge); }
    .who__ava {
      width: 30px; height: 30px; border-radius: 9px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
      color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .02em;
    }
    .who__meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; }
    .who__name { font-size: 13px; font-weight: 650; color: var(--ink); }
    .who__role { font-size: 11px; color: var(--ink-4); }
    .who__caret { font-size: 18px; width: 18px; height: 18px; color: var(--ink-4); }

    .menu-head {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 16px 11px;
      border-bottom: 1px solid var(--edge-2);
      margin-bottom: 4px;
    }
    .menu-head strong { font-size: 13.5px; color: var(--ink); }
    .menu-head span { font-size: 11.5px; color: var(--ink-4); }

    /* ---------- kontent ---------- */
    .content { flex: 1 1 auto; overflow-y: auto; }

    .boot {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; height: 60vh; color: var(--ink-3); font-size: 13.5px;
    }

    @media (max-width: 980px) {
      .shell { grid-template-columns: 76px 1fr; }
      .nav__text, .brand__text, .nav__label { display: none; }
      .nav__item, .nav__collapse, .brand { justify-content: center; padding: 0; }
      .nav__foot { display: none; }
      .who__meta { display: none; }
      .org-pick__field { width: 160px; }
    }
  `]
})
export class AppComponent implements OnInit {
  organizations: Organization[] = [];
  selectedOrgId: string | null = null;
  isAuthPage = false;
  orgsLoaded = false;
  collapsed = false;
  pageTitle = 'Boshqaruv paneli';

  readonly navGroups: NavGroup[] = [
    {
      title: 'Umumiy',
      items: [
        { path: '/dashboard', icon: 'space_dashboard', label: 'Boshqaruv paneli' },
        { path: '/chat', icon: 'forum', label: 'Chat sinovi' },
      ],
    },
    {
      title: 'Bilim va vositalar',
      items: [
        { path: '/knowledge', icon: 'auto_stories', label: 'Bilimlar bazasi' },
        { path: '/tools', icon: 'handyman', label: 'Vositalar' },
      ],
    },
    {
      title: 'Faoliyat',
      items: [
        { path: '/conversations', icon: 'chat_bubble', label: 'Suhbatlar' },
        { path: '/executions', icon: 'history', label: 'Bajarilgan amallar' },
        { path: '/complaints', icon: 'flag', label: 'Murojaatlar' },
      ],
    },
    {
      title: 'Boshqaruv',
      items: [
        { path: '/widget', icon: 'waving_hand', label: 'Widget sozlamalari' },
        { path: '/organizations', icon: 'apartment', label: 'Tashkilotlar', superOnly: true },
        { path: '/users', icon: 'shield_person', label: 'Adminlar', superOnly: true },
      ],
    },
  ];

  private readonly titles: Record<string, string> = {
    '/dashboard': 'Boshqaruv paneli',
    '/chat': 'Chat sinovi',
    '/knowledge': 'Bilimlar bazasi',
    '/tools': 'Vositalar',
    '/conversations': 'Suhbatlar',
    '/executions': 'Bajarilgan amallar',
    '/complaints': 'Murojaatlar',
    '/widget': 'Widget sozlamalari',
    '/organizations': 'Tashkilotlar',
    '/users': 'Adminlar',
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    readonly loading: LoadingService
  ) {}

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get currentUsername(): string {
    return this.authService.getCurrentUser()?.username || '';
  }

  get initials(): string {
    const name = this.currentUsername.trim();
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  }

  visible(group: NavGroup): NavItem[] {
    return group.items.filter(i => !i.superOnly || this.isSuperAdmin);
  }

  ngOnInit(): void {
    this.isAuthPage = this.router.url.startsWith('/login');
    this.setTitle(this.router.url);

    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.loading.setNavigating(true);
      else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.loading.setNavigating(false);
      }
    });

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      this.isAuthPage = url.startsWith('/login');
      this.setTitle(url);
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

  /** Eng uzun mos prefiks — /knowledge/:id ham "Bilimlar bazasi" deb qoladi. */
  private setTitle(url: string): void {
    if (url.startsWith('/reload')) return;
    const match = Object.keys(this.titles)
      .filter(p => url.startsWith(p))
      .sort((a, b) => b.length - a.length)[0];
    this.pageTitle = match ? this.titles[match] : 'OLIMA AI';
  }

  loadOrganizations(resetSelection = true): void {
    this.apiService.getOrganizations().subscribe({
      next: (orgs) => {
        this.organizations = orgs;
        const saved = localStorage.getItem('selectedOrgId');
        let currentOrg: Organization | undefined;
        if (saved && orgs.some(o => o.id === saved)) {
          this.selectedOrgId = saved;
          currentOrg = orgs.find(o => o.id === saved);
        } else if (orgs.length > 0 && resetSelection) {
          this.selectedOrgId = orgs[0].id;
          currentOrg = orgs[0];
          localStorage.setItem('selectedOrgId', this.selectedOrgId);
        }
        if (currentOrg) {
          localStorage.setItem('selectedOrgName', currentOrg.name);
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
    const org = this.organizations.find(o => o.id === orgId);
    if (org) {
      localStorage.setItem('selectedOrgName', org.name);
    }
    window.dispatchEvent(new Event('orgChanged'));
    this.reloadForOrg();
  }

  /**
   * Ko'p sahifalar tashkilotni faqat ngOnInit'da o'qiydi — almashtirilganda ro'yxat eskisicha qolardi.
   * Har sahifaga tinglovchi qo'shish o'rniga joriy sahifa qayta yaratiladi.
   * Ichki sahifa (/tools/:id, /knowledge/:id ...) eski tashkilotniki — o'sha bo'limning ro'yxatiga qaytamiz.
   */
  private reloadForOrg(): void {
    const path = this.router.url.split(/[?#]/)[0];
    const first = path.split('/').filter(Boolean)[0];
    const target = first ? '/' + first : '/dashboard';
    this.router.navigateByUrl('/reload', { skipLocationChange: true })
      .then(() => this.router.navigateByUrl(target));
  }

  logout(): void {
    this.authService.logout();
  }
}
