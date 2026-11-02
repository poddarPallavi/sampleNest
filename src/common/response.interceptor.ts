import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// An Interceptor can run logic both before AND after a route handler executes,
// because it wraps the call in an RxJS stream. This one reshapes every
// successful response from the TasksController into a consistent envelope,
// which is a common pattern for APIs consumed by frontends.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
