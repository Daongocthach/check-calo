import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ensureRemoteImage, deleteOrphanedFoodEntryAssets } from './foodImageStorage';
import { syncRecentFoodToCloud } from './recentFoodSync';

type StoredRow = { id: string; image_uri: string | null; thumbnail_uri: string | null };

const mockRows = new Map<string, StoredRow>();
const mockUpsert = jest.fn<(payload: unknown) => Promise<{ error: null }>>();

jest.mock('@/config/env', () => ({
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon' },
}));

jest.mock('@/integrations/supabase', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }) },
    from: () => ({ upsert: (payload: unknown) => mockUpsert(payload) }),
  },
}));

jest.mock('@/services/database/sqlite', () => ({
  getDatabase: () =>
    Promise.resolve({
      getFirstAsync: (_sql: string, [id]: [string]) => {
        const row = mockRows.get(id);
        return Promise.resolve(row ? { ...row } : null);
      },
      withTransactionAsync: (task: () => Promise<void>) => task(),
      runAsync: (
        sql: string,
        [nextUri, id, previousUri]: [string | null, string, string | null]
      ) => {
        const row = mockRows.get(id);
        const column = sql.includes('SET image_uri') ? 'image_uri' : 'thumbnail_uri';
        if (row && row[column] === previousUri) row[column] = nextUri;
        return Promise.resolve();
      },
    }),
}));

jest.mock('./foodImageStorage', () => ({
  ensureRemoteImage: jest.fn(),
  deleteOrphanedFoodEntryAssets: jest.fn(() => Promise.resolve()),
}));

const mockEnsureRemoteImage = jest.mocked(ensureRemoteImage);
const mockDeleteOrphans = jest.mocked(deleteOrphanedFoodEntryAssets);

function toRemote(uri: string) {
  return uri.replace('file://local/', 'https://cdn.example/');
}

beforeEach(() => {
  mockRows.clear();
  mockUpsert.mockReset().mockResolvedValue({ error: null });
  mockEnsureRemoteImage.mockReset().mockImplementation(async (uri) => {
    if (!uri) return null;
    return uri.startsWith('file://') ? toRemote(uri) : uri;
  });
  mockDeleteOrphans.mockClear();
});

describe('syncRecentFoodToCloud', () => {
  it('stores the uploaded URIs locally so the next sync does not upload again', async () => {
    mockRows.set('recent-1', {
      id: 'recent-1',
      image_uri: 'file://local/photo.jpg',
      thumbnail_uri: 'file://local/thumb.jpg',
    });

    await syncRecentFoodToCloud('recent-1');
    await syncRecentFoodToCloud('recent-1');

    expect(mockRows.get('recent-1')).toEqual({
      id: 'recent-1',
      image_uri: 'https://cdn.example/photo.jpg',
      thumbnail_uri: 'https://cdn.example/thumb.jpg',
    });
    expect(mockEnsureRemoteImage).toHaveBeenNthCalledWith(
      3,
      'https://cdn.example/photo.jpg',
      'recent-1',
      'recent-foods'
    );
    expect(mockDeleteOrphans).toHaveBeenCalledTimes(1);
    expect(mockDeleteOrphans).toHaveBeenCalledWith(
      'file://local/photo.jpg',
      'file://local/thumb.jpg'
    );
  });

  it('runs overlapping syncs for the same food one after another', async () => {
    mockRows.set('recent-2', {
      id: 'recent-2',
      image_uri: 'file://local/photo.jpg',
      thumbnail_uri: 'file://local/photo.jpg',
    });

    await Promise.all([syncRecentFoodToCloud('recent-2'), syncRecentFoodToCloud('recent-2')]);

    const localUploads = mockEnsureRemoteImage.mock.calls.filter(([uri]) =>
      uri?.startsWith('file://')
    );
    expect(localUploads).toHaveLength(1);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it('keeps the local file when the upload fails', async () => {
    mockRows.set('recent-3', {
      id: 'recent-3',
      image_uri: 'file://local/photo.jpg',
      thumbnail_uri: 'file://local/photo.jpg',
    });
    mockEnsureRemoteImage.mockImplementation(async (uri) => uri ?? null);

    await syncRecentFoodToCloud('recent-3');

    expect(mockRows.get('recent-3')?.image_uri).toBe('file://local/photo.jpg');
    expect(mockDeleteOrphans).not.toHaveBeenCalled();
  });
});
