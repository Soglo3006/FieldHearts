interface ServiceLocationFields {
  location?: string | null;
  address?: string | null;
  city?: string | null;
  hide_exact_location?: boolean | null;
}

function cleanLocation(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getExactServiceLocation(service: ServiceLocationFields): string {
  return cleanLocation(service.address) ?? cleanLocation(service.location) ?? cleanLocation(service.city) ?? "";
}

export function getPublicServiceLocation(service: ServiceLocationFields): string {
  if (service.hide_exact_location) {
    return cleanLocation(service.city) ?? cleanLocation(service.location) ?? cleanLocation(service.address) ?? "";
  }

  return getExactServiceLocation(service);
}

export function hasApproximateServiceLocation(service: ServiceLocationFields): boolean {
  return Boolean(service.hide_exact_location);
}