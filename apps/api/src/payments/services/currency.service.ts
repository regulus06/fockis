import { BadRequestException, Injectable } from '@nestjs/common';

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', CA: 'CAD', HT: 'HTG', DO: 'DOP', MX: 'MXN', BR: 'BRL', GB: 'GBP',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
  CH: 'CHF', AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR',
};

const ZERO_DECIMAL = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);

@Injectable()
export class CurrencyService {
  currencyForCountry(country: string): string {
    const code = String(country || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) throw new BadRequestException('A valid ISO country code is required.');
    return COUNTRY_CURRENCY[code] ?? 'USD';
  }

  exponent(currency: string): number {
    return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
  }

  toMinorUnits(amount: number, currency: string): number {
    const exponent = this.exponent(currency);
    const factor = 10 ** exponent;
    return Math.round(amount * factor);
  }

  fromMinorUnits(amount: number, currency: string): number {
    const exponent = this.exponent(currency);
    return amount / 10 ** exponent;
  }
}
