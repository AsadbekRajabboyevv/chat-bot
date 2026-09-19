import { Component, Input } from '@angular/core';

/** OLIMA brendidagi loader: aylanuvchi gradient halqa ichida logo + yuqorida progress chizig'i. */
@Component({
  selector: 'app-brand-loader',
  standalone: true,
  template: `
    <div class="bar" aria-hidden="true"><i></i></div>
    <div class="center" role="status" aria-live="polite">
      <div class="mark">
        <span class="ring"></span>
        <img src="assets/logo-96.png" alt="" />
      </div>
      <span class="label">{{ label }}</span>
    </div>
  `,
  styles: [`
    :host { position: absolute; inset: 0; z-index: 20; display: block;
            background: color-mix(in srgb, var(--bg, #f4f5fa) 72%, transparent);
            backdrop-filter: blur(2px); animation: fade .18s ease both; }
    .bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden; }
    .bar i { position: absolute; top: 0; bottom: 0; width: 40%; border-radius: 3px;
             background: linear-gradient(90deg, transparent, var(--brand, #6366f1), var(--accent, #a855f7), transparent);
             animation: sweep 1.1s cubic-bezier(.4, 0, .2, 1) infinite; }
    .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
              justify-content: center; gap: 14px; }
    .mark { position: relative; width: 72px; height: 72px; display: grid; place-items: center; }
    .ring { position: absolute; inset: 0; border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0 25%, var(--brand, #6366f1) 60%, var(--accent, #a855f7) 100%);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
                    mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
            animation: spin .9s linear infinite; }
    .mark img { width: 52px; height: 52px; border-radius: 50%; background: var(--surface, #fff); padding: 6px;
                box-sizing: border-box; box-shadow: 0 6px 20px rgba(79, 70, 229, .22);
                animation: breathe 1.8s ease-in-out infinite; }
    .label { font-size: 13px; font-weight: 600; letter-spacing: .2px; color: var(--ink-3, #64748b); }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes sweep { from { left: -40%; } to { left: 100%; } }
    @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(.94); } }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .ring, .bar i, .mark img { animation: none; }
      .bar i { left: 0; width: 100%; opacity: .6; }
    }
  `],
})
export class BrandLoaderComponent {
  @Input() label = 'Yuklanmoqda…';
}
