
export function rootPath(rootId: string): string {
  return `/${rootId}/`;
}

export function childPath(parentPath: string, childId: string): string {
  return `${parentPath}${childId}/`;
}

export function pathIds(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function ancestorIds(path: string): string[] {
  return pathIds(path).slice(0, -1);
}

export function coveringIds(path: string): string[] {
  return pathIds(path);
}
