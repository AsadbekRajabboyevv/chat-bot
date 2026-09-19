import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Organization } from '../../models';

/**
 * Mijoz saytidagi widget ko'rinishi — tashkilot admini o'zi boshqaradi.
 * Hozircha: logo ustida chiqadigan salomlashish kartasi (matn + yoqish/o'chirish).
 * Saqlangan zahoti mijoz saytida keyingi sahifa yangilanishida ko'rinadi — qayta ulash shart emas.
 */
@Component({
  selector: 'app-widget-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule],
  template: `
    <div class="wrap">
      <div class="loading" *ngIf="loading"><mat-spinner diameter="28"></mat-spinner></div>

      <div class="empty" *ngIf="!loading && !org">
        <mat-icon>apartment</mat-icon>
        <p>Avval tepadagi ro'yxatdan tashkilotni tanlang.</p>
      </div>

      <div class="grid" *ngIf="!loading && org">
        <section class="card">
          <header>
            <h3>Salomlashish xabari</h3>
            <p>Saytingizga kirgan mehmonga bir necha soniyadan keyin chat logosi ustida chiqadi.
               Bosilsa — chat ochiladi, × bosilsa — shu mehmonga qayta ko'rsatilmaydi.</p>
          </header>

          <mat-slide-toggle [(ngModel)]="enabled" color="primary">
            Salomlashishni ko'rsatish
          </mat-slide-toggle>

          <label class="field" [class.off]="!enabled">
            <span class="lbl">Matn</span>
            <textarea rows="4" maxlength="300" [(ngModel)]="greeting" [disabled]="!enabled"
                      [placeholder]="defaultGreeting"></textarea>
            <span class="hint">
              <span>Bo'sh qoldirilsa standart matn chiqadi</span>
              <span [class.warn]="greeting.length > 260">{{ greeting.length }} / 300</span>
            </span>
          </label>

          <div class="presets" [class.off]="!enabled">
            <span class="lbl">Tayyor namunalar</span>
            <button type="button" class="chip" *ngFor="let p of presets" (click)="greeting = p.text" [disabled]="!enabled">
              {{ p.label }}
            </button>
          </div>

          <div class="actions">
            <button mat-stroked-button (click)="reset()" [disabled]="saving || !dirty">Bekor qilish</button>
            <button mat-flat-button color="primary" (click)="save()" [disabled]="saving || !dirty">
              <mat-icon>check</mat-icon> Saqlash
            </button>
          </div>
        </section>

        <section class="card preview">
          <header>
            <h3>Ko'rinishi</h3>
            <p>Mijoz saytining o'ng pastki burchagida</p>
          </header>
          <div class="stage">
            <div class="site"><i></i><i></i><i class="short"></i></div>
            <div class="greet" *ngIf="enabled; else offTpl">
              <span class="x">×</span>
              <div class="who">
                <img src="assets/logo-96.png" alt="" />
                <span>OLIMA AI yordamchisi</span><i class="dot"></i>
              </div>
              <p class="msg">{{ greeting.trim() || defaultGreeting }}</p>
              <div class="cta">Savol berish →</div>
            </div>
            <ng-template #offTpl><div class="offnote">Salomlashish o'chirilgan — faqat logo ko'rinadi</div></ng-template>
            <div class="bubble"><img src="assets/logo-96.png" alt="" /></div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding: var(--gap, 24px); max-width: 1180px; }
    .loading, .empty { display: grid; place-items: center; gap: 8px; padding: 64px 16px; color: var(--ink-3, #64748b); }
    .empty mat-icon { font-size: 36px; width: 36px; height: 36px; }
    .grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--surface, #fff); border: 1px solid var(--edge, #e6e9f0); border-radius: var(--r-lg, 16px);
            padding: 20px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    header h3 { margin: 0 0 4px; font-size: 16px; }
    header p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--ink-3, #64748b); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2, #334155); }
    textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 96px; font: inherit; font-size: 14.5px; line-height: 1.45;
               padding: 10px 12px; border: 1px solid var(--edge, #e6e9f0); border-radius: var(--r-sm, 8px);
               background: var(--surface, #fff); color: var(--ink, #0f172a); }
    textarea:focus { outline: 2px solid var(--brand, #6366f1); outline-offset: -1px; border-color: transparent; }
    .hint { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--ink-4, #94a3b8); }
    .hint .warn { color: var(--warn, #d97706); font-weight: 600; }
    .off { opacity: .5; }
    .presets { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .presets .lbl { width: 100%; }
    .chip { border: 1px solid var(--edge, #e6e9f0); background: var(--bg, #f4f5fa); color: var(--ink-2, #334155);
            border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
    .chip:hover:not(:disabled) { border-color: var(--brand, #6366f1); color: var(--brand, #6366f1); }
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

    .stage { position: relative; height: 330px; border-radius: var(--r, 12px); overflow: hidden;
             background: linear-gradient(180deg, #eef2f7, #f8fafc); border: 1px solid var(--edge, #e6e9f0); }
    .site { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .site i { display: block; height: 10px; border-radius: 5px; background: #dde3ec; }
    .site i.short { width: 55%; }
    .bubble { position: absolute; right: 16px; bottom: 16px; width: 52px; height: 52px; border-radius: 50%; background: #fff;
              display: grid; place-items: center; box-shadow: 0 8px 24px rgba(20,25,60,.25); }
    .bubble img { width: 34px; height: 34px; object-fit: contain; }
    .greet { position: absolute; right: 16px; bottom: 80px; width: 272px; max-width: calc(100% - 32px); box-sizing: border-box;
             background: #fff; color: #16191C; border: 1px solid #E4E6EA; border-radius: 16px; border-bottom-right-radius: 4px;
             padding: 14px 16px; box-shadow: 0 12px 36px rgba(20,25,60,.18); }
    .greet .x { position: absolute; top: 8px; right: 12px; color: #5B6168; font-size: 17px; }
    .greet .who { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: #5B6168; margin: 0 20px 6px 0; min-width: 0; }
    .greet .who span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .greet .who img { width: 20px; height: 20px; flex: none; }
    .greet .dot { width: 7px; height: 7px; border-radius: 50%; background: #1DB954; flex: none; }
    .greet .msg { margin: 0; font-size: 14.5px; line-height: 1.45; overflow-wrap: anywhere; }
    .greet .cta { margin-top: 10px; font-size: 13px; font-weight: 600; color: var(--brand, #6366f1); }
    .offnote { position: absolute; right: 16px; bottom: 84px; font-size: 12.5px; color: var(--ink-3, #64748b);
               background: #fff; border: 1px dashed var(--edge, #e6e9f0); border-radius: 8px; padding: 8px 10px; }
  `],
})
export class WidgetSettingsComponent implements OnInit, OnDestroy {
  readonly defaultGreeting = "Salom! 👋 Savolingiz bormi? Rasmiy hujjatlar asosida darhol javob beraman.";
  readonly presets = [
    { label: 'Qabul', text: "Salom! 👋 Qabul, hujjat topshirish yoki kontrakt bo'yicha savolingiz bormi? Darhol javob beraman." },
    { label: 'Talabalar', text: "Salom! 👋 Kontrakt, stipendiya yoki o'qishni ko'chirish bo'yicha savolingiz bormi? Rasmiy hujjatlar asosida javob beraman." },
    { label: "O'quv markazi", text: "Salom! 👋 Kurslar, narxlar yoki dars jadvali bo'yicha savolingiz bormi? Hoziroq javob beraman." },
    { label: '24/7', text: "Salom! 👋 Men 24/7 onlaynman — savolingizni yozing, bir necha soniyada javob beraman." },
  ];

  org: Organization | null = null;
  greeting = '';
  enabled = true;
  loading = true;
  saving = false;

  private readonly orgChangeListener = () => this.load();

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  get dirty(): boolean {
    if (!this.org) return false;
    return this.greeting.trim() !== (this.org.widgetGreeting ?? '')
      || this.enabled !== (this.org.widgetGreetingEnabled ?? true);
  }

  ngOnInit(): void {
    this.load();
    window.addEventListener('orgChanged', this.orgChangeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('orgChanged', this.orgChangeListener);
  }

  load(): void {
    this.loading = true;
    this.api.getOrganizations().subscribe({
      next: (orgs) => {
        const selected = localStorage.getItem('selectedOrgId');
        this.org = (selected && orgs.find(o => o.id === selected)) || orgs[0] || null;
        this.reset();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open("Tashkilotni yuklab bo'lmadi", 'OK', { duration: 4000 });
      },
    });
  }

  reset(): void {
    this.greeting = this.org?.widgetGreeting ?? '';
    this.enabled = this.org?.widgetGreetingEnabled ?? true;
  }

  save(): void {
    if (!this.org) return;
    this.saving = true;
    const text = this.greeting.trim();
    this.api.updateWidgetSettings(this.org.id, { greeting: text || null, greetingEnabled: this.enabled }).subscribe({
      next: (org) => {
        this.org = org;
        this.reset();
        this.saving = false;
        this.snack.open("Saqlandi — saytingizda sahifa yangilanganda ko'rinadi", 'OK', { duration: 3500 });
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(e.error?.message || "Saqlab bo'lmadi", 'OK', { duration: 4000 });
      },
    });
  }
}
