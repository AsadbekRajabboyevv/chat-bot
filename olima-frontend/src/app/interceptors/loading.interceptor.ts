import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/** So'rovni loader'siz yuborish: `{ context: new HttpContext().set(SKIP_LOADER, true) }` */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

/**
 * Faqat ma'lumot yuklash (GET) loader'ni ko'rsatadi. Saqlash/o'chirish (POST/PUT/DELETE) tugmalarning
 * o'zida holat ko'rsatadi, chat esa oqim bilan ishlaydi — ular uchun butun sahifani yopish noto'g'ri.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || req.context.get(SKIP_LOADER) || req.url.includes('/chat')) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
