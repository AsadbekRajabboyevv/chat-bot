import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Bo'sh ro'yxat uchun yagona ko'rinish: OLIMA logosi + bo'lim belgisi, sarlavha, izoh va (ixtiyoriy) harakat.
 * Harakat tugmasi ichiga joylanadi:
 *   <app-empty-state icon="history" title="..." text="..."><button mat-flat-button>...</button></app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="art" aria-hidden="true">
      <span class="halo"></span>
      <span class="orbit"></span>
      <span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span>
      <img src="assets/logo-96.png" alt="" />
      <span class="badge"><mat-icon>{{ icon }}</mat-icon></span>
    </div>
    <h3>{{ title }}</h3>
    @if (text) { <p>{{ text }}</p> }
    <div class="actions"><ng-content></ng-content></div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; align-items: center; text-align: center;
            padding: 56px 20px 64px; margin-top: 8px; border-radius: var(--r-lg, 16px);
            background: var(--surface, #fff); border: 1px dashed var(--edge, #e6e9f0); }
    .art { position: relative; width: 132px; height: 132px; display: grid; place-items: center; margin-bottom: 22px; }
    .halo { position: absolute; inset: 14px; border-radius: 50%;
            background: radial-gradient(circle at 35% 30%, var(--brand-soft, #eef2ff), var(--accent-soft, #f3e8ff) 70%); }
    .orbit { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed color-mix(in srgb, var(--brand, #6366f1) 35%, transparent);
             animation: turn 24s linear infinite; }
    .dot { position: absolute; width: 8px; height: 8px; border-radius: 50%; }
    .d1 { top: 6px; left: 50%; background: var(--brand, #6366f1); }
    .d2 { bottom: 18px; left: 4px; width: 6px; height: 6px; background: var(--accent, #a855f7); }
    .d3 { top: 34px; right: 2px; width: 5px; height: 5px; background: #38bdf8; }
    img { position: relative; width: 64px; height: 64px; border-radius: 50%; padding: 8px; box-sizing: border-box;
          background: var(--surface, #fff); box-shadow: 0 10px 30px rgba(79, 70, 229, .18); }
    .badge { position: absolute; right: 22px; bottom: 22px; width: 34px; height: 34px; border-radius: 50%;
             display: grid; place-items: center; color: #fff;
             background: linear-gradient(135deg, var(--brand, #6366f1), var(--accent, #a855f7));
             box-shadow: 0 0 0 4px var(--surface, #fff); }
    .badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: var(--ink, #0f172a); }
    p { margin: 0; max-width: 460px; font-size: 14px; line-height: 1.6; color: var(--ink-3, #64748b); }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 20px; }
    .actions:empty { display: none; }
    @keyframes turn { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .orbit { animation: none; } }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = "Hozircha hech narsa yo'q";
  @Input() text = '';
}
