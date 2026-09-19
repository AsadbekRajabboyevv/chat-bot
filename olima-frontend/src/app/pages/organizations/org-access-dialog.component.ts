import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { AppUser, Organization } from '../../models';

/**
 * Super admin uchun: bitta tashkilotning ulanish ma'lumotlari — kirish hisobi va SDK qatori,
 * hamda hammasini mijozga beriladigan faylga yuklab olish.
 *
 * Parol ko'rsatilmaydi va ko'rsatib bo'lmaydi: bazada BCrypt xeshi turadi, asl matn saqlanmaydi.
 * Shuning uchun "parolni ko'rish" emas, "yangi parol yaratish" — u faqat shu oynada,
 * bir marta ko'rinadi. Oyna yopilsa qayta tiklab bo'lmaydi, faqat yana yangisini yaratish mumkin.
 */
@Component({
  selector: 'app-org-access-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatTooltipModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="head">
      <span class="icon-pill"><mat-icon>vpn_key</mat-icon></span>
      <div class="grow">
        <h2>Ulanish ma'lumotlari</h2>
        <p>{{ org.name }}</p>
      </div>
      <button mat-icon-button mat-dialog-close><mat-icon>close</mat-icon></button>
    </div>

    <div class="body">
      <!-- ---------- 1. Kirish hisobi ---------- -->
      <section>
        <div class="row--sb sec-head">
          <h3>1 · Panelga kirish</h3>
          <button mat-stroked-button (click)="createAdmin()" [disabled]="busy" *ngIf="!loading">
            <mat-icon>person_add</mat-icon> Yangi admin
          </button>
        </div>

        <div class="loading" *ngIf="loading">
          <mat-spinner diameter="22"></mat-spinner><span>Yuklanmoqda...</span>
        </div>

        <div class="empty-mini" *ngIf="!loading && admins.length === 0">
          <mat-icon>person_off</mat-icon>
          <span>Bu tashkilotda hali admin yo'q — mijoz panelga kira olmaydi.</span>
        </div>

        <div class="acct" *ngFor="let a of admins">
          <div class="acct__row">
            <span class="k">Manzil</span>
            <span class="v mono">{{ origin }}</span>
            <button mat-icon-button (click)="copy(origin)" matTooltip="Nusxa olish"><mat-icon>content_copy</mat-icon></button>
          </div>
          <div class="acct__row">
            <span class="k">Login</span>
            <span class="v mono">{{ a.username }}</span>
            <button mat-icon-button (click)="copy(a.username)" matTooltip="Nusxa olish"><mat-icon>content_copy</mat-icon></button>
          </div>
          <div class="acct__row">
            <span class="k">Parol</span>
            <ng-container *ngIf="freshPasswords[a.username]; else hidden">
              <span class="v mono pw">{{ freshPasswords[a.username] }}</span>
              <button mat-icon-button (click)="copy(freshPasswords[a.username])" matTooltip="Nusxa olish"><mat-icon>content_copy</mat-icon></button>
            </ng-container>
            <ng-template #hidden>
              <span class="v dim">saqlanmaydi — faqat yangisini yaratish mumkin</span>
              <button mat-stroked-button class="regen" (click)="resetPassword(a)" [disabled]="busy">
                <mat-icon>autorenew</mat-icon> Yangi parol
              </button>
            </ng-template>
          </div>
        </div>

        <div class="note" *ngIf="hasFresh">
          <mat-icon>warning_amber</mat-icon>
          <span>Parol faqat shu oynada ko'rinadi. Oyna yopilsa qayta ko'rsatib bo'lmaydi —
                nusxa oling yoki faylni yuklab oling.</span>
        </div>
      </section>

      <!-- ---------- 2. SDK ---------- -->
      <section>
        <div class="row--sb sec-head">
          <h3>2 · Saytga ulash (SDK)</h3>
          <button mat-stroked-button (click)="copy(snippet)">
            <mat-icon>content_copy</mat-icon> Nusxa olish
          </button>
        </div>
        <p class="hint">Mijoz shu qatorni sayti sahifasining <span class="mono">&lt;/body&gt;</span>
           tegidan oldin qo'yadi. Build kerak emas. Kalit tashkilotni server tomonda aniqlaydi —
           uni sayt kodida ko'rsatish xavfsiz: boshqa tashkilotga o'tib bo'lmaydi.</p>
        <pre class="snippet mono">{{ snippet }}</pre>
      </section>

      <!-- ---------- 3. Texnik ma'lumot ---------- -->
      <section>
        <h3 class="sec-head">3 · Texnik ma'lumot</h3>
        <div class="acct">
          <div class="acct__row">
            <span class="k">Widget kaliti</span>
            <span class="v mono">{{ org.widgetKey || '—' }}</span>
            <button mat-icon-button (click)="copy(org.widgetKey || '')" matTooltip="Nusxa olish"><mat-icon>content_copy</mat-icon></button>
          </div>
          <div class="acct__row">
            <span class="k">Tashkilot ID</span>
            <span class="v mono">{{ org.id }}</span>
            <button mat-icon-button (click)="copy(org.id)" matTooltip="Nusxa olish"><mat-icon>content_copy</mat-icon></button>
          </div>
          <div class="acct__row">
            <span class="k">Qisqa nom</span>
            <span class="v mono">{{ org.slug }}</span>
          </div>
          <div class="acct__row">
            <span class="k">API</span>
            <span class="v mono">{{ origin }}/api/v1</span>
          </div>
        </div>
      </section>
    </div>

    <div class="foot">
      <span class="dim">Fayl mijozga topshirish uchun tayyorlanadi</span>
      <span class="grow"></span>
      <button mat-button mat-dialog-close>Yopish</button>
      <button mat-flat-button color="primary" (click)="download()">
        <mat-icon>download</mat-icon> Faylni yuklab olish
      </button>
    </div>
  `,
  styles: [`
    .head {
      display: flex; align-items: center; gap: 13px;
      padding: 18px 20px; border-bottom: 1px solid var(--edge-2);
    }
    .head h2 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .head p  { margin: 2px 0 0; font-size: 13px; color: var(--ink-3); }

    .body { padding: 4px 20px 20px; max-height: 62vh; overflow-y: auto; }

    section { margin-top: 20px; }
    .sec-head { margin-bottom: 10px; }
    h3 {
      margin: 0; font-size: 12px; font-weight: 700;
      letter-spacing: .05em; text-transform: uppercase; color: var(--ink-3);
    }

    .hint { margin: 0 0 9px; font-size: 12.5px; color: var(--ink-3); line-height: 18px; }

    .acct {
      border: 1px solid var(--edge);
      border-radius: var(--r);
      overflow: hidden;
      background: #fbfcfe;
    }
    .acct + .acct { margin-top: 10px; }
    .acct__row {
      display: flex; align-items: center; gap: 12px;
      padding: 9px 8px 9px 14px;
      border-bottom: 1px solid var(--edge-2);
      min-height: 46px;
    }
    .acct__row:last-child { border-bottom: none; }
    .k { flex: 0 0 104px; font-size: 12px; font-weight: 650; color: var(--ink-3); }
    .v { flex: 1 1 auto; font-size: 13px; color: var(--ink); word-break: break-all; }
    .v.pw {
      font-weight: 700; color: #4338ca;
      background: var(--brand-soft); padding: 2px 8px; border-radius: 6px;
      flex: 0 0 auto;
    }
    .regen { flex: 0 0 auto; }

    .note {
      display: flex; gap: 9px; align-items: flex-start;
      margin-top: 10px; padding: 10px 13px;
      background: var(--warn-soft); border: 1px solid #fde68a;
      border-radius: 10px; font-size: 12.5px; color: #92400e; line-height: 18px;
    }
    .note mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; color: var(--warn); }

    .empty-mini {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; border: 1px dashed var(--edge); border-radius: var(--r);
      font-size: 13px; color: var(--ink-3);
    }
    .empty-mini mat-icon { color: var(--ink-4); }

    .loading { display: flex; align-items: center; gap: 10px; padding: 16px; color: var(--ink-3); font-size: 13px; }

    .snippet {
      margin: 0; padding: 14px 16px;
      background: #0f172a; color: #cbd5e1;
      font-size: 12px; line-height: 19px;
      border-radius: var(--r); overflow-x: auto; white-space: pre;
    }

    .foot {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px; border-top: 1px solid var(--edge-2);
      background: #fbfcfe;
      font-size: 12px;
    }
  `]
})
export class OrgAccessDialogComponent implements OnInit {
  org: Organization;
  admins: AppUser[] = [];
  freshPasswords: Record<string, string> = {};
  loading = true;
  busy = false;
  readonly origin = location.origin;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { org: Organization },
    private api: ApiService,
    private snack: MatSnackBar,
    private ref: MatDialogRef<OrgAccessDialogComponent>
  ) {
    this.org = data.org;
  }

  get hasFresh(): boolean {
    return Object.keys(this.freshPasswords).length > 0;
  }

  /** Kalit tashkilotni server tomonda aniqlaydi — data-org va data-api endi kerak emas. */
  get snippet(): string {
    const key = this.org.widgetKey || 'wk_...';
    return `<script src="${this.origin}/widget.js"\n        data-key="${key}"\n        async></script>`;
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.api.getUsers().subscribe({
      next: (users) => {
        this.admins = users.filter(u => u.organizationId === this.org.id);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  /** Chalkashtiradigan belgilarsiz (0/O, 1/l/I) — mijoz qo'lda tera olishi kerak. */
  private makePassword(): string {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const num = '23456789';
    const low = 'abcdefghijkmnpqrstuvwxyz';
    const pool = abc + low + num;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let out = pick(abc) + pick(low) + pick(num);
    for (let i = 0; i < 9; i++) out += pick(pool);
    return out;
  }

  createAdmin(): void {
    const base = (this.org.slug || 'admin').replace(/[^a-z0-9]/gi, '').toLowerCase();
    let username = base;
    let n = 1;
    while (this.admins.some(a => a.username === username)) username = base + ++n;

    const password = this.makePassword();
    this.busy = true;
    this.api.createUser({
      username, password, role: 'ORG_ADMIN' as any, organizationId: this.org.id,
    }).subscribe({
      next: (u) => {
        this.admins = [...this.admins, u];
        this.freshPasswords[username] = password;
        this.busy = false;
        this.snack.open(`"${username}" yaratildi`, 'OK', { duration: 3000 });
      },
      error: (e) => {
        this.busy = false;
        this.snack.open(e.error?.message || 'Yaratib bo\'lmadi', 'OK', { duration: 4000 });
      },
    });
  }

  /** Bitta so'rov: yiqilsa eski parol amalda qoladi, mijoz kirishdan mahrum bo'lmaydi. */
  resetPassword(user: AppUser): void {
    const password = this.makePassword();
    this.busy = true;
    this.api.resetUserPassword(user.id, password).subscribe({
      next: (u) => {
        this.admins = this.admins.map(a => (a.id === user.id ? u : a));
        this.freshPasswords[user.username] = password;
        this.busy = false;
        this.snack.open('Yangi parol yaratildi', 'OK', { duration: 3000 });
      },
      error: (e) => {
        this.busy = false;
        this.snack.open(e.error?.message || 'Parolni almashtirib bo\'lmadi', 'OK', { duration: 4000 });
      },
    });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(
      () => this.snack.open('Nusxalandi', '', { duration: 1500 }),
      () => this.snack.open('Nusxalab bo\'lmadi', 'OK', { duration: 3000 })
    );
  }

  download(): void {
    const d = new Date();
    const sana = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

    const lines: string[] = [];
    lines.push('OLIMA AI — ulanish ma\'lumotlari');
    lines.push('='.repeat(56));
    lines.push('');
    lines.push(`Tashkilot : ${this.org.name}`);
    lines.push(`Sana      : ${sana}`);
    lines.push('');
    lines.push('1) PANELGA KIRISH');
    lines.push('-'.repeat(56));
    lines.push(`Manzil : ${this.origin}`);
    if (this.admins.length === 0) {
      lines.push('Hisob   : yaratilmagan');
    } else {
      for (const a of this.admins) {
        lines.push('');
        lines.push(`Login  : ${a.username}`);
        lines.push(`Parol  : ${this.freshPasswords[a.username] ?? '(bu faylda yo\'q — panelda "Yangi parol" bosing)'}`);
      }
    }
    lines.push('');
    lines.push('2) SAYTGA ULASH');
    lines.push('-'.repeat(56));
    lines.push('Quyidagi qatorni sayt sahifasining </body> tegidan oldin qo\'ying:');
    lines.push('');
    lines.push(this.snippet);
    lines.push('');
    lines.push('3) TEXNIK MA\'LUMOT');
    lines.push('-'.repeat(56));
    lines.push(`Widget kaliti : ${this.org.widgetKey ?? '-'}`);
    lines.push(`Tashkilot ID  : ${this.org.id}`);
    lines.push(`Qisqa nom    : ${this.org.slug}`);
    lines.push(`API          : ${this.origin}/api/v1`);
    lines.push('');
    lines.push('-'.repeat(56));
    lines.push('Diqqat: parolni birinchi kirishdan keyin almashtiring.');
    lines.push('Bu faylni ochiq kanallar orqali yubormang.');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olima-${this.org.slug || 'tashkilot'}-ulanish.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.snack.open('Fayl yuklab olindi', 'OK', { duration: 2500 });
  }
}
