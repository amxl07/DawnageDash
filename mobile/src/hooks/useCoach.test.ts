import { coachInitials, toCoachLookup } from './useCoach';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

describe('toCoachLookup', () => {
  it('normalizes an assigned coach', () => {
    expect(toCoachLookup([{ id: 'c1', full_name: 'Amal Manoj', avatar_url: null }])).toEqual({
      kind: 'assigned',
      coach: { id: 'c1', full_name: 'Amal Manoj', avatar_url: null },
    });
  });

  it('distinguishes no assignment from an unavailable RPC', () => {
    expect(toCoachLookup([])).toEqual({ kind: 'unassigned' });
    expect(toCoachLookup(null, new Error('missing function'))).toEqual({ kind: 'unavailable' });
  });
});

describe('coachInitials', () => {
  it.each([
    ['Amal Manoj', 'AM'],
    ['Amal', 'A'],
    ['  Amal   Manoj  ', 'AM'],
    ['   ', '—'],
    [null, '—'],
  ])('returns %p for %p', (name, expected) => {
    expect(coachInitials(name)).toBe(expected);
  });
});
