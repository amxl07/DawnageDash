import {
  normalizeServerUrl,
  validateServerUrl,
} from '@/data/server-url';

describe('server URL policy', () => {
  it('normalizes an HTTPS server URL by trimming whitespace and a trailing slash', () => {
    expect(normalizeServerUrl('  https://fitness.example/  ')).toBe(
      'https://fitness.example',
    );
  });

  it('accepts HTTPS URLs in production', () => {
    expect(validateServerUrl('https://fitness.example/', false)).toBe(
      'https://fitness.example',
    );
  });

  it('rejects malformed URLs', () => {
    expect(() => validateServerUrl('fitness.example', true)).toThrow(
      'Enter a complete server URL.',
    );
  });

  it('rejects public HTTP URLs even during development', () => {
    expect(() => validateServerUrl('http://fitness.example', true)).toThrow(
      'Use HTTPS for public servers.',
    );
  });

  it('accepts a private-network HTTP URL only during development', () => {
    expect(validateServerUrl('http://192.168.1.44:8080/', true)).toBe(
      'http://192.168.1.44:8080',
    );
  });

  it('rejects private-network HTTP URLs outside development', () => {
    expect(() => validateServerUrl('http://192.168.1.44:8080', false)).toThrow(
      'Use HTTPS outside development.',
    );
  });
});
