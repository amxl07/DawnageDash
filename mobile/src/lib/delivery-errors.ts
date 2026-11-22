export type DeliveryFailure = {
  kind:
    | 'transport'
    | 'temporary-server'
    | 'auth'
    | 'permission'
    | 'validation'
    | 'conflict'
    | 'unknown';
  retryable: boolean;
  code: string;
};

type ErrorShape = {
  error?: unknown;
  name?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
};

type NormalizedError = {
  shape: ErrorShape;
  status: number | null;
  responseEnvelope: boolean;
};

const TRANSPORT_MESSAGES = new Map([
  ['network request failed', 'network-request-failed'],
  ['failed to fetch', 'failed-to-fetch'],
  ['load failed', 'load-failed'],
]);

const TRANSPORT_CODES = new Set([
  'eai_again',
  'econnaborted',
  'econnreset',
  'enetdown',
  'enetunreach',
  'etimedout',
]);

const TEMPORARY_POSTGREST_CODES = new Set(['pgrst000', 'pgrst001', 'pgrst002', 'pgrst003']);
const AUTH_POSTGREST_CODES = new Set(['pgrst301', 'pgrst302']);

function shapeOf(error: unknown): ErrorShape {
  return error && typeof error === 'object' ? error as ErrorShape : {};
}

function statusOf(error: ErrorShape): number | null {
  const status = typeof error.status === 'number' ? error.status : error.statusCode;
  return typeof status === 'number' && Number.isInteger(status) ? status : null;
}

function normalizeError(error: unknown): NormalizedError {
  const outer = shapeOf(error);
  const responseEnvelope = outer.error !== undefined && outer.error !== null;
  if (!responseEnvelope) {
    return { shape: outer, status: statusOf(outer), responseEnvelope: false };
  }

  const inner = shapeOf(outer.error);
  return {
    shape: inner,
    status: statusOf(outer) ?? statusOf(inner),
    responseEnvelope: true,
  };
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function failure(
  kind: DeliveryFailure['kind'],
  retryable: boolean,
  code: string,
): DeliveryFailure {
  return { kind, retryable, code };
}

/** Classifies only evidenced delivery failures and retains no server response text. */
export function classifyDeliveryFailure(error: unknown): DeliveryFailure {
  const { shape, status, responseEnvelope } = normalizeError(error);
  const providerCode = stringOf(shape.code);
  const message = stringOf(shape.message);
  const name = stringOf(shape.name);

  if (
    status === 401 ||
    providerCode === 'session_expired' ||
    providerCode === 'jwt_expired' ||
    AUTH_POSTGREST_CODES.has(providerCode)
  ) {
    const code = AUTH_POSTGREST_CODES.has(providerCode)
      ? providerCode
      : providerCode === 'jwt_expired' ? 'jwt-expired' : 'session-expired';
    return failure('auth', false, code);
  }

  if (status === 403 || providerCode === '42501') {
    return failure('permission', false, providerCode === '42501' ? '42501' : 'http-403');
  }

  if (status === 409 || providerCode === '23505') {
    return failure('conflict', false, providerCode === '23505' ? '23505' : 'http-409');
  }

  if (
    status === 400 ||
    status === 422 ||
    providerCode.startsWith('22') ||
    providerCode === '23502' ||
    providerCode === '23514'
  ) {
    const code = providerCode.match(/^(22[a-z0-9]{3}|23502|23514)$/)?.[0]
      ?? `http-${status}`;
    return failure('validation', false, code);
  }

  const wrapped = message.match(/^(typeerror|fetcherror|aborterror):\s*(.+)$/);
  const wrappedName = wrapped?.[1] ?? '';
  const wrappedMessage = wrapped?.[2] ?? '';
  const transportMessage = TRANSPORT_MESSAGES.get(message) ?? TRANSPORT_MESSAGES.get(wrappedMessage);
  if (
    transportMessage &&
    (
      error instanceof TypeError ||
      name === 'typeerror' ||
      wrappedName === 'typeerror' ||
      wrappedName === 'fetcherror' ||
      (responseEnvelope && status === 0)
    )
  ) {
    return failure('transport', true, transportMessage);
  }
  if (name === 'aborterror' || wrappedName === 'aborterror') {
    return failure('transport', true, 'request-aborted');
  }
  if (TRANSPORT_CODES.has(providerCode)) {
    return failure('transport', true, providerCode.replaceAll('_', '-'));
  }
  if (status === 429 || (status !== null && status >= 500 && status <= 599)) {
    return failure('temporary-server', true, `http-${status}`);
  }
  if (TEMPORARY_POSTGREST_CODES.has(providerCode)) {
    return failure('temporary-server', true, providerCode);
  }

  return failure('unknown', false, status === null ? 'unknown' : `http-${status}`);
}
