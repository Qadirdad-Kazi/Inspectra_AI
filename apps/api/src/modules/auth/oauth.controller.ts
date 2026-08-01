import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators';
import { resolveWebOrigins } from '../../common/utils/web-origins';
import { AuthService } from './auth.service';

function allowedWebOrigins(): string[] {
  return resolveWebOrigins();
}

/** Only allow OAuth post-login redirects to configured WEB_URL origins. */
function resolveOAuthFrontendBase(state: string | undefined): string {
  const allowed = allowedWebOrigins();
  const fallback = allowed[0] ?? 'http://localhost:3000';
  if (!state) return fallback;
  try {
    const candidate = new URL(state);
    const ok = allowed.some((origin) => {
      try {
        return new URL(origin).origin === candidate.origin;
      } catch {
        return false;
      }
    });
    return ok ? candidate.origin : fallback;
  } catch {
    return fallback;
  }
}

/**
 * OAuth entrypoints. When GOOGLE_/GITHUB_ client IDs are unset,
 * endpoints return a clear configuration error instead of crashing.
 */
@ApiTags('Auth')
@ApiExcludeController()
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get(':provider')
  start(@Param('provider') provider: string, @Res() res: Response) {
    if (provider !== 'google' && provider !== 'github') {
      return res.status(400).json({ code: 'UNSUPPORTED_PROVIDER', message: 'Use google or github' });
    }

    const webUrl = allowedWebOrigins()[0] ?? 'http://localhost:3000';
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
        });
      }
      const redirectUri = `${apiUrl}/v1/auth/oauth/google/callback`;
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('access_type', 'online');
      // state is only our known frontend origin — never attacker-controlled redirect
      url.searchParams.set('state', webUrl);
      return res.redirect(url.toString());
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET',
      });
    }
    const redirectUri = `${apiUrl}/v1/auth/oauth/github/callback`;
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', webUrl);
    return res.redirect(url.toString());
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    const req = res.req as { query: Record<string, string> };
    const code = req.query.code;
    const frontendBase = resolveOAuthFrontendBase(req.query.state);

    if (!code || (provider !== 'google' && provider !== 'github')) {
      return res.redirect(`${frontendBase}/sign-in?error=oauth_failed`);
    }

    try {
      const profile =
        provider === 'google'
          ? await this.exchangeGoogle(code)
          : await this.exchangeGithub(code);

      const session = await this.authService.upsertOAuthUser({
        provider,
        ...profile,
      });

      // Tokens in URL fragment — not sent to servers / Referer (OWASP)
      const redirect = new URL('/auth/callback', frontendBase);
      redirect.hash = new URLSearchParams({
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
      }).toString();
      return res.redirect(redirect.toString());
    } catch {
      return res.redirect(`${frontendBase}/sign-in?error=oauth_failed`);
    }
  }

  private async exchangeGoogle(code: string) {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: `${apiUrl}/v1/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new Error('google token failed');

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };
    return {
      providerUserId: profile.id,
      email: profile.email,
      name: profile.name,
      imageUrl: profile.picture,
    };
  }

  private async exchangeGithub(code: string) {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${apiUrl}/v1/auth/oauth/github/callback`,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new Error('github token failed');

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const user = (await userRes.json()) as {
      id: number;
      email?: string;
      name?: string;
      login: string;
      avatar_url?: string;
    };

    let email = user.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });
      const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean }>;
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
    }
    if (!email) throw new Error('github email missing');

    return {
      providerUserId: String(user.id),
      email,
      name: user.name || user.login,
      imageUrl: user.avatar_url,
    };
  }
}
