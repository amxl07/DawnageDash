import { storagePath, uploadPhoto } from './photos';

const mockUpload = jest.fn(async (..._args: unknown[]) => ({ data: { path: 'uploaded' }, error: null }));
jest.mock('./supabase', () => ({ supabase: { storage: { from: () => ({
  upload: (...args: unknown[]) => mockUpload(...args),
  getPublicUrl: () => ({ data: { publicUrl: 'https://fixture.invalid/public/photo.jpg' } }),
}) } } }));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: async () => ({ uri: 'file:///fixture.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

const owner = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  global.fetch = jest.fn(async () => ({
    blob: async () => ({ size: 100 }), arrayBuffer: async () => new ArrayBuffer(100),
  })) as unknown as typeof fetch;
});
afterEach(() => jest.restoreAllMocks());

it('returns the canonical object reference after upload, never a public URL', async () => {
  expect(await uploadPhoto('file:///photo.jpg', owner, '2026-09-19', 'Front')).toEqual({
    objectPath: `${owner}/2026-09-19/front_1234567890.jpg`, bytes: 100,
  });
});

it('rejects path traversal before constructing an upload destination', () => {
  expect(() => storagePath(owner, '../other-owner', 'Front')).toThrow();
});
