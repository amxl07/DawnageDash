import { PostgrestClient } from '@supabase/postgrest-js';

import { classifyDeliveryFailure } from './delivery-errors';

describe('classifyDeliveryFailure', () => {
  it.each([
    [new TypeError('Network request failed'), { kind: 'transport', retryable: true, code: 'network-request-failed' }],
    [new TypeError('Failed to fetch'), { kind: 'transport', retryable: true, code: 'failed-to-fetch' }],
    [{ message: 'request failed', status: 429 }, { kind: 'temporary-server', retryable: true, code: 'http-429' }],
    [{ message: 'upstream unavailable', status: 503 }, { kind: 'temporary-server', retryable: true, code: 'http-503' }],
    [{ message: 'Database connection failed', details: null, hint: null, code: 'PGRST000' }, { kind: 'temporary-server', retryable: true, code: 'pgrst000' }],
    [{ message: 'JWT expired', status: 401, code: 'session_expired' }, { kind: 'auth', retryable: false, code: 'session-expired' }],
    [{ message: 'JWT expired', details: null, hint: null, code: 'PGRST301' }, { kind: 'auth', retryable: false, code: 'pgrst301' }],
    [{ message: 'new row violates row-level security policy', details: null, hint: null, code: '42501' }, { kind: 'permission', retryable: false, code: '42501' }],
    [{ message: 'invalid input syntax', details: null, hint: null, code: '22P02' }, { kind: 'validation', retryable: false, code: '22p02' }],
    [{ message: 'duplicate key value violates unique constraint', details: null, hint: null, code: '23505' }, { kind: 'conflict', retryable: false, code: '23505' }],
  ] as const)('classifies a real delivery error shape without retaining its message', (error, expected) => {
    expect(classifyDeliveryFailure(error)).toEqual(expected);
  });

  it('does not call a generic error offline without transport evidence', () => {
    expect(classifyDeliveryFailure(new Error('offline'))).toEqual({
      kind: 'unknown',
      retryable: false,
      code: 'unknown',
    });
  });

  it('allowlists an unknown provider code instead of persisting it', () => {
    expect(classifyDeliveryFailure({
      message: 'secret response body',
      status: 418,
      code: 'provider_internal_customer_123',
    })).toEqual({ kind: 'unknown', retryable: false, code: 'http-418' });
  });

  it('classifies the installed PostgREST SDK offline envelope as retryable transport', async () => {
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => { throw new TypeError('Network request failed'); },
    });

    const response = await client.from('records').select('id').retry(false);

    expect(response.status).toBe(0);
    expect(classifyDeliveryFailure(response.error)).toEqual({
      kind: 'transport',
      retryable: true,
      code: 'network-request-failed',
    });
    expect(classifyDeliveryFailure(response)).toEqual({
      kind: 'transport',
      retryable: true,
      code: 'network-request-failed',
    });
  });

  it('keeps an unknown installed PostgREST SDK status-zero envelope blocked', async () => {
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => { throw new Error('adapter invariant violated'); },
    });

    const response = await client.from('records').select('id').retry(false);

    expect(response.status).toBe(0);
    expect(classifyDeliveryFailure(response)).toEqual({
      kind: 'unknown',
      retryable: false,
      code: 'http-0',
    });
  });

  it('classifies an installed PostgREST SDK wrapped abort as evidenced transport', async () => {
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => {
        throw Object.assign(new Error('request canceled'), { name: 'AbortError' });
      },
    });

    const response = await client.from('records').select('id').retry(false);

    expect(response.status).toBe(0);
    expect(classifyDeliveryFailure(response)).toEqual({
      kind: 'transport',
      retryable: true,
      code: 'request-aborted',
    });
  });

  it.each([
    [401, { message: 'TypeError: Network request failed', code: '', details: null, hint: null }, { kind: 'auth', retryable: false, code: 'session-expired' }],
    [403, { message: 'TypeError: Network request failed', code: '42501', details: null, hint: null }, { kind: 'permission', retryable: false, code: '42501' }],
    [400, { message: 'TypeError: Network request failed', code: '22P02', details: null, hint: null }, { kind: 'validation', retryable: false, code: '22p02' }],
    [409, { message: 'TypeError: Network request failed', code: '23505', details: null, hint: null }, { kind: 'conflict', retryable: false, code: '23505' }],
    [503, { message: 'private upstream text', code: '', details: null, hint: null }, { kind: 'temporary-server', retryable: true, code: 'http-503' }],
  ] as const)('uses outer HTTP status %s from an installed PostgREST response', async (status, body, expected) => {
    const client = new PostgrestClient('https://delivery.test', {
      fetch: async () => new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    });

    const response = await client.from('records').select('id').retry(false);

    expect(classifyDeliveryFailure(response)).toEqual(expected);
  });

  it('gives a recognized nonretryable provider code precedence over transport-looking text', () => {
    expect(classifyDeliveryFailure({
      message: 'TypeError: Network request failed',
      code: '42501',
    })).toEqual({ kind: 'permission', retryable: false, code: '42501' });
  });
});
