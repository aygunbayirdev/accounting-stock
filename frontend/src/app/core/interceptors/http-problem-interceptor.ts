import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

type ProblemDetails = {
  title?: string; status?: number; detail?: string;
  errors?: Record<string, string[]>; traceId?: string;
};

export const httpProblemInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const p = (err.error || {}) as ProblemDetails;
      const isProblem = typeof p === 'object' && (p.title || p.errors);

      if (isProblem) {
        snack.open(p.title || 'İstek hatası', 'Kapat', { duration: 6000 });
        if (p.detail) snack.open(p.detail, 'Kapat', { duration: 6000 });
        if (p.errors) {
          for (const [k, arr] of Object.entries(p.errors)) {
            (arr || []).forEach(m => snack.open(`${k}: ${m}`, 'Kapat', { duration: 6000 }));
          }
        }
        if (p.traceId) console.warn('TraceId:', p.traceId);
      } else {
        const msg = err.status === 0 ? 'Ağ/CORS hatası' : `Hata (${err.status})`;
        snack.open(msg, 'Kapat', { duration: 6000 });
      }

      return throwError(() => err);
    })
  );
};
