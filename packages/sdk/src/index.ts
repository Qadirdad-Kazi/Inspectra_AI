export type InspectraClientOptions = {
  baseUrl: string;
  apiKey?: string;
};

/**
 * Public SDK client scaffold — methods intentionally stubbed.
 */
export class InspectraClient {
  constructor(private readonly options: InspectraClientOptions) {}

  get baseUrl(): string {
    return this.options.baseUrl;
  }

  async health(): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.options.baseUrl}/health`);
    if (!res.ok) {
      return { ok: false };
    }
    return { ok: true };
  }
}

export function createClient(options: InspectraClientOptions): InspectraClient {
  return new InspectraClient(options);
}
