import type {
  CountryCurrency,
  SeriesEpisode,
} from '../types/musicCreateRelease.types';

/**
 * Convert a title or text value into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Return the current local date/time in the format required
 * by an HTML datetime-local input.
 */
export function getMinimumDateTime(): string {
  const now = new Date();

  now.setMinutes(
    now.getMinutes() - now.getTimezoneOffset(),
  );

  return now.toISOString().slice(0, 16);
}

/**
 * Find the currency configuration for a country.
 *
 * Falls back to the first configured country if the
 * requested country code cannot be found.
 */
export function getCountryCurrency(
  countryCode: string,
  countries: CountryCurrency[],
): CountryCurrency {
  return (
    countries.find(
      (country) => country.code === countryCode,
    ) ?? countries[0]
  );
}

/**
 * Format a monetary value using the country's
 * locale and currency configuration.
 */
export function formatCurrency(
  amount: number,
  country: CountryCurrency,
): string {
  if (!Number.isFinite(amount)) {
    amount = 0;
  }

  try {
    return new Intl.NumberFormat(
      country.locale,
      {
        style: 'currency',
        currency: country.currency,
        minimumFractionDigits: country.decimals,
        maximumFractionDigits: country.decimals,
      },
    ).format(amount);
  } catch {
    return `${country.symbol}${amount.toFixed(
      country.decimals,
    )}`;
  }
}

/**
 * Convert a major-unit currency amount into
 * the country's minor-unit amount.
 *
 * Example:
 * USD 9.99 -> 999
 */
export function getMinorUnitAmount(
  amount: number,
  country: CountryCurrency,
): number {
  return Math.round(
    amount *
      Math.pow(
        10,
        country.decimals,
      ),
  );
}

/**
 * Add a number of calendar days to a Date.
 */
export function addDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

/**
 * Create a new series episode.
 *
 * Episodes default to video, but the producer can
 * change the media type to audio in the UI.
 */
export function createEpisode(
  index: number,
): SeriesEpisode {
  return {
    id: `episode-${Date.now()}-${index}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    title: `Episode ${index}`,

    description: '',

    mediaKind: 'video',

    mediaUrl: '',

    coverImageUrl: '',

    releaseDate: '',
  };
}

/**
 * Convert an unknown API/client error into a
 * user-friendly message.
 */
export function parseApiError(
  error: unknown,
  fallback: string,
): string {
  const responseMessage = (
    error as {
      response?: {
        data?: {
          message?: unknown;
        };
      };
    }
  )?.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }

  if (
    typeof responseMessage === 'string' &&
    responseMessage.trim()
  ) {
    return responseMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}