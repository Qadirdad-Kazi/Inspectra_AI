import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants';
import {
  accessLogMiddleware,
  requestIdMiddleware,
} from './common/middleware/http-observability';
import { createLogger } from '@inspectra/logger';
import { incCounter } from './common/metrics/registry';

const log = createLogger({
  name: 'api',
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info',
});

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  // Fail fast on weak JWT config before wiring the app
  const { resolveJwtSecret } = await import('./common/utils/jwt-secret');
  resolveJwtSecret();

  const app = await NestFactory.create(AppModule, {
    abortOnError: isProd,
    rawBody: true,
    logger: ['error', 'warn', 'log'],
  });

  // Comma-separated frontend origins for CORS + OAuth redirects (no trailing slash)
  const corsOrigins = (process.env.WEB_URL ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Trust reverse proxy (nginx / ingress) for correct client IPs + rate limits
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1);

  app.use(requestIdMiddleware);
  app.use(accessLogMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", ...corsOrigins],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );

  // Global API rate limit (OWASP A04/A07 abuse prevention)
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? (isProd ? 120 : 1000));
  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests — slow down and retry',
      },
      skip: (req) =>
        req.path === '/health' ||
        req.path === '/health/ready' ||
        req.path === '/metrics',
      handler: (req, res, _next, options) => {
        incCounter('http_rate_limited_total', 'Requests rejected by rate limiter', {
          path: req.path,
        });
        res.status(options.statusCode).json(options.message);
      },
    }),
  );

  // Stricter limit on auth endpoints
  app.use(
    '/v1/auth',
    rateLimit({
      windowMs: 15 * 60_000,
      max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many auth attempts',
      },
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-organization-id',
      'x-request-id',
      'stripe-signature',
    ],
    exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_PREFIX, {
    exclude: ['health', 'health/ready', 'metrics', 'v1/webhooks/stripe'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger only outside production (or when explicitly enabled)
  if (!isProd || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Inspectra AI API')
      .setDescription(
        'Control-plane REST API contracts for authentication, organizations, audits, reports, billing, and notifications.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'x-organization-id', in: 'header' },
        'organization',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  log.info('api listening', {
    port,
    env: process.env.NODE_ENV ?? 'development',
    corsOrigins,
  });
}

void bootstrap();
