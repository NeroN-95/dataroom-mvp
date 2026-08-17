export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Stats {
  folderCount: number;
  fileCount: number;
  totalSize: number;
}

export interface DataRoom {
  id: string;
  name: string;
  ownerId: string;
  rootId?: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: Stats;
}

interface BaseNode {
  id: string;
  name: string;
  parentId: string | null;
  dataRoomId: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderEntry extends BaseNode {
  type: 'folder';
}
export interface FileEntry extends BaseNode {
  type: 'file';
}

export type Entry = FolderEntry | FileEntry;
export type NodeEntry = Entry;

export interface Crumb {
  id: string;
  name: string;
}

export interface Listing {
  dataRoomId: string;
  folder: { id: string; name: string } | null;
  breadcrumb: Crumb[];
  items: Entry[];
  nextCursor: string | null;
}

export interface Page {
  items: Entry[];
  nextCursor: string | null;
}

export type ShareMode = 'PUBLIC' | 'RESTRICTED';
export type ShareRole = 'VIEWER' | 'EDITOR';

export interface ShareGrant {
  userId: string;
  email: string;
  name: string;
  role: ShareRole;
}

export interface Share {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: 'FOLDER' | 'FILE';
  mode: ShareMode;
  role: ShareRole;
  token: string | null;
  url: string | null;
  createdAt: string;
  revokedAt: string | null;
  grants: ShareGrant[];
}

export interface CreateShareResult {
  share: Share;
  notFoundEmails: string[];
}

export interface SharedResource {
  token: string;
  mode: ShareMode;
  nodeType: 'FOLDER' | 'FILE';
  resource: { id: string; name: string };
  owner: { name: string };
  file: FileEntry | null;
}
