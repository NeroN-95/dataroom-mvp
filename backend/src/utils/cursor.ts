export interface PageCursor {
  phase: 'folder' | 'file';
  name: string;
  id: string;
}

export function encodeCursor(c: PageCursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeCursor(raw?: string | null): PageCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      (parsed.phase === 'folder' || parsed.phase === 'file') &&
      typeof parsed.name === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function seekWhere(name: string, id: string) {
  return {
    OR: [{ name: { gt: name } }, { AND: [{ name }, { id: { gt: id } }] }],
  };
}
