function parseServerUrl(input: string): URL {
  try {
    const url = new URL(input.trim());

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new Error('unsupported URL parts');
    }

    return url;
  } catch {
    throw new Error('Enter a complete server URL.');
  }
}

function isDevelopmentHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') {
    return true;
  }

  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

export function normalizeServerUrl(input: string): string {
  const url = parseServerUrl(input);
  const pathname = url.pathname.replace(/\/+$/, '');

  return `${url.protocol}//${url.host}${pathname}`;
}

export function validateServerUrl(input: string, isDevelopment: boolean): string {
  const url = parseServerUrl(input);

  if (url.protocol === 'https:') {
    return normalizeServerUrl(input);
  }

  if (!isDevelopment) {
    throw new Error('Use HTTPS outside development.');
  }

  if (!isDevelopmentHost(url.hostname)) {
    throw new Error('Use HTTPS for public servers.');
  }

  return normalizeServerUrl(input);
}
