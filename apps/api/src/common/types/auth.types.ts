export type AuthPrincipal = {
  userId: string;
  email: string;
  sessionId?: string;
  apiKeyId?: string;
  organizationId?: string;
  role?: 'owner' | 'admin' | 'analyst' | 'viewer';
  scopes?: string[];
  isPlatformAdmin?: boolean;
};

export type RequestContext = {
  principal: AuthPrincipal;
  organizationId: string;
};
