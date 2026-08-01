import { createHash, randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { createLogger } from '@inspectra/logger';

const log = createLogger({ name: 'http' });

type ReqWithId = Request & { requestId?: string };

/** Attach/propagate X-Request-Id for correlation across logs and clients. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId =
    incoming && /^[a-zA-Z0-9._-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  (req as ReqWithId).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/** Structured access log — avoids logging Authorization / cookies / bodies. */
export function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    log.info('request', {
      requestId: (req as ReqWithId).requestId,
      method: req.method,
      path: route,
      status: res.statusCode,
      durationMs: Date.now() - start,
      userAgent: req.get('user-agent')?.slice(0, 120),
    });
  });
  next();
}

/** Lightweight fingerprint for abuse signals (not a privacy-preserving ID). */
export function clientFingerprint(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
