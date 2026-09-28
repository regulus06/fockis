export interface FockisCountry {
  code: string;
  name: string;
  callingCode: string;
}

export const FOCKIS_COUNTRIES: readonly FockisCountry[] = [
  { code: 'US', name: 'United States', callingCode: '+1' },
  { code: 'CA', name: 'Canada', callingCode: '+1' },
  { code: 'HT', name: 'Haiti', callingCode: '+509' },
  { code: 'DO', name: 'Dominican Republic', callingCode: '+1' },
  { code: 'FR', name: 'France', callingCode: '+33' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44' },
  { code: 'DE', name: 'Germany', callingCode: '+49' },
  { code: 'ES', name: 'Spain', callingCode: '+34' },
  { code: 'IT', name: 'Italy', callingCode: '+39' },
  { code: 'BR', name: 'Brazil', callingCode: '+55' },
  { code: 'MX', name: 'Mexico', callingCode: '+52' },
  { code: 'JM', name: 'Jamaica', callingCode: '+1' },
  { code: 'PR', name: 'Puerto Rico', callingCode: '+1' },
  { code: 'IN', name: 'India', callingCode: '+91' },
  { code: 'CN', name: 'China', callingCode: '+86' },
  { code: 'JP', name: 'Japan', callingCode: '+81' },
  { code: 'KR', name: 'South Korea', callingCode: '+82' },
  { code: 'NG', name: 'Nigeria', callingCode: '+234' },
  { code: 'GH', name: 'Ghana', callingCode: '+233' },
  { code: 'KE', name: 'Kenya', callingCode: '+254' },
  { code: 'ZA', name: 'South Africa', callingCode: '+27' },

  // Central America
  { code: 'GT', name: 'Guatemala', callingCode: '+502' },
  { code: 'BZ', name: 'Belize', callingCode: '+501' },
  { code: 'SV', name: 'El Salvador', callingCode: '+503' },
  { code: 'HN', name: 'Honduras', callingCode: '+504' },
  { code: 'NI', name: 'Nicaragua', callingCode: '+505' },
  { code: 'CR', name: 'Costa Rica', callingCode: '+506' },
  { code: 'PA', name: 'Panama', callingCode: '+507' },

  // Caribbean
  { code: 'CU', name: 'Cuba', callingCode: '+53' },
  { code: 'BS', name: 'Bahamas', callingCode: '+1' },
  { code: 'BB', name: 'Barbados', callingCode: '+1' },
  { code: 'TT', name: 'Trinidad and Tobago', callingCode: '+1' },
  { code: 'LC', name: 'Saint Lucia', callingCode: '+1' },
  { code: 'GD', name: 'Grenada', callingCode: '+1' },
  { code: 'DM', name: 'Dominica', callingCode: '+1' },
  { code: 'AG', name: 'Antigua and Barbuda', callingCode: '+1' },
  { code: 'KN', name: 'Saint Kitts and Nevis', callingCode: '+1' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', callingCode: '+1' },

  // South America
  { code: 'AR', name: 'Argentina', callingCode: '+54' },
  { code: 'BO', name: 'Bolivia', callingCode: '+591' },
  { code: 'CL', name: 'Chile', callingCode: '+56' },
  { code: 'CO', name: 'Colombia', callingCode: '+57' },
  { code: 'EC', name: 'Ecuador', callingCode: '+593' },
  { code: 'GY', name: 'Guyana', callingCode: '+592' },
  { code: 'PY', name: 'Paraguay', callingCode: '+595' },
  { code: 'PE', name: 'Peru', callingCode: '+51' },
  { code: 'SR', name: 'Suriname', callingCode: '+597' },
  { code: 'UY', name: 'Uruguay', callingCode: '+598' },
  { code: 'VE', name: 'Venezuela', callingCode: '+58' },

  // Europe
  { code: 'NL', name: 'Netherlands', callingCode: '+31' },
  { code: 'BE', name: 'Belgium', callingCode: '+32' },
  { code: 'CH', name: 'Switzerland', callingCode: '+41' },
  { code: 'AT', name: 'Austria', callingCode: '+43' },
  { code: 'DK', name: 'Denmark', callingCode: '+45' },
  { code: 'SE', name: 'Sweden', callingCode: '+46' },
  { code: 'NO', name: 'Norway', callingCode: '+47' },
  { code: 'PL', name: 'Poland', callingCode: '+48' },
  { code: 'GR', name: 'Greece', callingCode: '+30' },
  { code: 'PT', name: 'Portugal', callingCode: '+351' },
  { code: 'IE', name: 'Ireland', callingCode: '+353' },
  { code: 'IS', name: 'Iceland', callingCode: '+354' },
  { code: 'LU', name: 'Luxembourg', callingCode: '+352' },
  { code: 'FI', name: 'Finland', callingCode: '+358' },
  { code: 'CZ', name: 'Czech Republic', callingCode: '+420' },
  { code: 'SK', name: 'Slovakia', callingCode: '+421' },
  { code: 'HU', name: 'Hungary', callingCode: '+36' },
  { code: 'RO', name: 'Romania', callingCode: '+40' },
  { code: 'BG', name: 'Bulgaria', callingCode: '+359' },
  { code: 'HR', name: 'Croatia', callingCode: '+385' },
  { code: 'RS', name: 'Serbia', callingCode: '+381' },
  { code: 'UA', name: 'Ukraine', callingCode: '+380' },
  { code: 'TR', name: 'Turkey', callingCode: '+90' },

  // Asia
  { code: 'PK', name: 'Pakistan', callingCode: '+92' },
  { code: 'BD', name: 'Bangladesh', callingCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', callingCode: '+94' },
  { code: 'NP', name: 'Nepal', callingCode: '+977' },
  { code: 'TH', name: 'Thailand', callingCode: '+66' },
  { code: 'VN', name: 'Vietnam', callingCode: '+84' },
  { code: 'PH', name: 'Philippines', callingCode: '+63' },
  { code: 'MY', name: 'Malaysia', callingCode: '+60' },
  { code: 'SG', name: 'Singapore', callingCode: '+65' },
  { code: 'ID', name: 'Indonesia', callingCode: '+62' },
  { code: 'AU', name: 'Australia', callingCode: '+61' },
  { code: 'NZ', name: 'New Zealand', callingCode: '+64' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '+966' },
  { code: 'IL', name: 'Israel', callingCode: '+972' },

  // Africa
  { code: 'EG', name: 'Egypt', callingCode: '+20' },
  { code: 'MA', name: 'Morocco', callingCode: '+212' },
  { code: 'DZ', name: 'Algeria', callingCode: '+213' },
  { code: 'TN', name: 'Tunisia', callingCode: '+216' },
  { code: 'LY', name: 'Libya', callingCode: '+218' },
  { code: 'ET', name: 'Ethiopia', callingCode: '+251' },
  { code: 'UG', name: 'Uganda', callingCode: '+256' },
  { code: 'TZ', name: 'Tanzania', callingCode: '+255' },
  { code: 'RW', name: 'Rwanda', callingCode: '+250' },
  { code: 'BI', name: 'Burundi', callingCode: '+257' },
  { code: 'CM', name: 'Cameroon', callingCode: '+237' },
  { code: 'CI', name: "Côte d'Ivoire", callingCode: '+225' },
  { code: 'SN', name: 'Senegal', callingCode: '+221' },
  { code: 'ML', name: 'Mali', callingCode: '+223' },
  { code: 'BF', name: 'Burkina Faso', callingCode: '+226' },
  { code: 'NE', name: 'Niger', callingCode: '+227' },
  { code: 'BJ', name: 'Benin', callingCode: '+229' },
  { code: 'TG', name: 'Togo', callingCode: '+228' },
  { code: 'CD', name: 'Democratic Republic of the Congo', callingCode: '+243' },
  { code: 'CG', name: 'Republic of the Congo', callingCode: '+242' },
  { code: 'AO', name: 'Angola', callingCode: '+244' },
  { code: 'MZ', name: 'Mozambique', callingCode: '+258' },
  { code: 'ZM', name: 'Zambia', callingCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', callingCode: '+263' },
  { code: 'NA', name: 'Namibia', callingCode: '+264' },
  { code: 'BW', name: 'Botswana', callingCode: '+267' },
  { code: 'MG', name: 'Madagascar', callingCode: '+261' },
  { code: 'MU', name: 'Mauritius', callingCode: '+230' },
];

export function normalizeCountryCode(
  countryCode?: string | null,
): string | null {
  const value = String(countryCode || '')
    .trim()
    .toUpperCase();

  return value || null;
}

export function getFockisCountry(
  countryCode?: string | null,
): FockisCountry | null {
  const normalized = normalizeCountryCode(countryCode);

  if (!normalized) {
    return null;
  }

  return (
    FOCKIS_COUNTRIES.find(
      (country) => country.code === normalized,
    ) || null
  );
}

export function getCallingCodeForCountry(
  countryCode?: string | null,
): string | null {
  return getFockisCountry(countryCode)?.callingCode || null;
}

export function isValidCountryCode(
  countryCode?: string | null,
): boolean {
  return Boolean(getFockisCountry(countryCode));
}

export function formatPublicFockisId(
  fockisId?: string | null,
  callingCode?: string | null,
): string | null {
  const id = String(fockisId || '')
    .trim()
    .toUpperCase();

  if (!id) {
    return null;
  }

  const code = String(callingCode || '').trim();

  if (!code) {
    return id;
  }

  return `${code}-${id}`;
}