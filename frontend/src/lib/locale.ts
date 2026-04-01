export type AppLanguageCode = 'fr' | 'en';

export function getLanguageCode(language?: string | null): AppLanguageCode {
  return language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function isFrenchLanguage(language?: string | null): boolean {
  return getLanguageCode(language) === 'fr';
}

export function getIntlLocale(
  language?: string | null,
  locales?: Partial<Record<AppLanguageCode, string>>,
): string {
  const code = getLanguageCode(language);
  return code === 'fr' ? locales?.fr ?? 'fr-CA' : locales?.en ?? 'en-CA';
}

export function getLanguageToggleValue(language?: string | null): 'FR' | 'EN' {
  return getLanguageCode(language) === 'fr' ? 'FR' : 'EN';
}

export function getLanguageCodeFromAcceptLanguage(header?: string | null): AppLanguageCode {
  if (!header) return 'en';

  const primaryLanguage = header
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .find(Boolean);

  return getLanguageCode(primaryLanguage);
}