import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

interface RateResponse { rates?: Record<string, number>; }

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly cache = new Map<string, { rate: number; expiresAt: number }>();
  private readonly ttlMs = Number(process.env.EXCHANGE_RATE_CACHE_MS || 300000);
  private readonly url = String(process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest').replace(/\/$/, '');

  async getRate(baseCurrency: string, targetCurrency: string): Promise<number> {
    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();
    if (base === target) return 1;
    const key = `${base}:${target}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.rate;

    try {
      const response = await fetch(`${this.url}/${encodeURIComponent(base)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`FX provider HTTP ${response.status}`);
      const body = (await response.json()) as RateResponse;
      const rate = Number(body.rates?.[target]);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error(`No valid rate for ${target}`);
      this.cache.set(key, { rate, expiresAt: Date.now() + this.ttlMs });
      return rate;
    } catch (error) {
      this.logger.error(`Exchange-rate lookup failed for ${base}/${target}: ${String(error)}`);
      throw new BadGatewayException('Currency conversion is temporarily unavailable. Please try again.');
    }
  }
}
