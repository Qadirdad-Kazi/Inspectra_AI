import { Controller, Get, Headers, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { HealthService } from './health.service';
import { metricsSnapshot, renderPrometheus } from '../common/metrics/registry';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness — process is up (K8s livenessProbe). */
  @Public()
  @Get('health')
  live() {
    return this.health.live();
  }

  /** Readiness — dependencies reachable (K8s readinessProbe). */
  @Public()
  @Get('health/ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const body = await this.health.ready();
    if (body.status !== 'ready') {
      res.status(503);
    }
    return body;
  }

  /**
   * Prometheus text exposition.
   * Production: require METRICS_BEARER_TOKEN, or set METRICS_ALLOW_PUBLIC=true
   * (prefer network policy / sidecar scrape with a bearer token).
   */
  @Public()
  @Get('metrics')
  metrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const expected = process.env.METRICS_BEARER_TOKEN;
    const allowPublic = process.env.METRICS_ALLOW_PUBLIC === 'true';

    if (expected) {
      if (authorization !== `Bearer ${expected}`) {
        res.status(401).send('Unauthorized');
        return;
      }
    } else if (isProd && !allowPublic) {
      res.status(404).send('Not Found');
      return;
    }

    const snap = metricsSnapshot();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderPrometheus(snap));
  }
}
