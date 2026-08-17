export const qk = {
  rooms: ['rooms'] as const,
  room: (roomId: string) => ['room', roomId] as const,
  roomStats: (roomId: string) => ['roomStats', roomId] as const,
  listing: (roomId: string, folderId: string | null) =>
    ['listing', roomId, folderId] as const,
  listingRoom: (roomId: string) => ['listing', roomId] as const,
  search: (roomId: string, q: string) => ['search', roomId, q] as const,
  shared: (token: string) => ['shared', token] as const,
  sharedBrowse: (token: string, folderId: string | null) =>
    ['sharedBrowse', token, folderId] as const,
};
