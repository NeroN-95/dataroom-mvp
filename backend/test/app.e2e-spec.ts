import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
const uniq = () => Math.random().toString(36).slice(2, 10);

describe('Data Room API (e2e)', () => {
  let app: INestApplication;
  let http: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => app.close());

  const register = async () => {
    const email = `e2e_${uniq()}@test.dev`;
    const res = await request(http)
      .post('/api/auth/register')
      .send({ email, name: 'E2E', password: 'password123' })
      .expect(201);
    return { email, token: res.body.accessToken as string };
  };

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  describe('auth', () => {
    it('registers, logs in and returns the current user', async () => {
      const { email, token } = await register();
      await request(http).post('/api/auth/login').send({ email, password: 'password123' }).expect(201);
      const me = await request(http).get('/api/auth/me').set(auth(token)).expect(200);
      expect(me.body.email).toBe(email);
    });

    it('rejects bad password and anonymous access', async () => {
      const { email } = await register();
      await request(http).post('/api/auth/login').send({ email, password: 'nope' }).expect(401);
      await request(http).get('/api/data-rooms').expect(401);
    });
  });

  describe('tree: rooms, folders, files, conflicts, paging, search', () => {
    it('builds a tree, resolves name conflicts, paginates folders-first and searches', async () => {
      const { token } = await register();
      const h = auth(token);

      const room = (await request(http).post('/api/data-rooms').set(h).send({ name: 'Deal' }).expect(201)).body;
      expect(room.rootId).toBeTruthy();

      const legal = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Legal' }).expect(201)).body;
      expect(legal.type).toBe('folder');
      await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, parentId: legal.id, name: 'NDAs' }).expect(201);

      const dup = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Legal' }).expect(201)).body;
      expect(dup.name).toBe('Legal (1)');
      const conflict = await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Legal', onConflict: 'error' }).expect(409);
      expect(conflict.body.code).toBe('NAME_CONFLICT');

      const up = await request(http)
        .post('/api/nodes/upload')
        .set(h)
        .field('dataRoomId', room.id)
        .field('parentId', legal.id)
        .attach('files', PDF, { filename: 'report.pdf', contentType: 'application/pdf' })
        .expect(201);
      expect(up.body[0].type).toBe('file');
      expect(up.body[0].mimeType).toBe('application/pdf');

      await request(http)
        .post('/api/nodes/upload')
        .set(h)
        .field('dataRoomId', room.id)
        .attach('files', Buffer.from('not a pdf'), { filename: 'x.pdf', contentType: 'application/pdf' })
        .expect(400);

      const DOCX = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from('\x14\x00\x00\x00\x00\x00 [Content_Types].xml word/document.xml'),
      ]);
      const doc = await request(http)
        .post('/api/nodes/upload')
        .set(h)
        .field('dataRoomId', room.id)
        .field('parentId', legal.id)
        .attach('files', DOCX, { filename: 'brief.docx', contentType: 'application/octet-stream' })
        .expect(201);
      expect(doc.body[0].mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      const root = (await request(http).get(`/api/nodes/root?dataRoomId=${room.id}`).set(h).expect(200)).body;
      const order = root.items.map((i: any) => i.type).join(',');
      expect(order.indexOf('file')).toBe(-1);
      const kids = (await request(http).get(`/api/nodes/${legal.id}/children`).set(h).expect(200)).body;
      expect(kids.breadcrumb.map((c: any) => c.name)).toEqual(['Legal']);

      const search = (await request(http).get(`/api/nodes/search?dataRoomId=${room.id}&q=report`).set(h).expect(200)).body;
      expect(search.items.some((i: any) => i.name === 'report.pdf')).toBe(true);
    });

    it('moves a node and rejects moving a folder into its own subtree', async () => {
      const { token } = await register();
      const h = auth(token);
      const room = (await request(http).post('/api/data-rooms').set(h).send({ name: 'Move' }).expect(201)).body;
      const a = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'A' }).expect(201)).body;
      const b = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'B' }).expect(201)).body;

      const moved = (await request(http).patch(`/api/nodes/${a.id}/move`).set(h).send({ targetParentId: b.id }).expect(200)).body;
      expect(moved.parentId).toBe(b.id);
      await request(http).patch(`/api/nodes/${b.id}/move`).set(h).send({ targetParentId: a.id }).expect(400);
    });

    it('soft-deletes a subtree and hides it from listings', async () => {
      const { token } = await register();
      const h = auth(token);
      const room = (await request(http).post('/api/data-rooms').set(h).send({ name: 'Del' }).expect(201)).body;
      const f = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Temp' }).expect(201)).body;
      await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, parentId: f.id, name: 'Inner' }).expect(201);

      const preview = (await request(http).get(`/api/nodes/${f.id}/delete-preview`).set(h).expect(200)).body;
      expect(preview.folderCount).toBe(1);
      await request(http).delete(`/api/nodes/${f.id}`).set(h).expect(200);
      const root = (await request(http).get(`/api/nodes/root?dataRoomId=${room.id}`).set(h).expect(200)).body;
      expect(root.items.some((i: any) => i.id === f.id)).toBe(false);
    });
  });

  describe('sharing access model', () => {
    it('enforces public/restricted access, subtree scoping and revocation', async () => {
      const owner = await register();
      const outsider = await register();
      const h = auth(owner.token);
      const room = (await request(http).post('/api/data-rooms').set(h).send({ name: 'Share' }).expect(201)).body;
      const folder = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Shared' }).expect(201)).body;
      const inner = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, parentId: folder.id, name: 'Sub' }).expect(201)).body;
      const other = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Private' }).expect(201)).body;

      const pub = (await request(http).post('/api/shares').set(h).send({ nodeId: folder.id, mode: 'PUBLIC' }).expect(201)).body.share;
      await request(http).get(`/api/shared/${pub.token}`).expect(200);
      const browse = (await request(http).get(`/api/shared/${pub.token}/browse`).expect(200)).body;
      expect(browse.items.some((i: any) => i.id === inner.id)).toBe(true);
      await request(http).get(`/api/shared/${pub.token}/browse?folderId=${other.id}`).expect(404);

      const restr = (await request(http).post('/api/shares').set(h).send({ nodeId: other.id, mode: 'RESTRICTED', grantEmails: [outsider.email] }).expect(201)).body.share;
      await request(http).get(`/api/shared/${restr.token}`).expect(401);
      await request(http).get(`/api/shared/${restr.token}`).set(auth(outsider.token)).expect(200);

      await request(http).delete(`/api/shares/${pub.id}`).set(h).expect(200);
      await request(http).get(`/api/shared/${pub.token}`).expect(404);
    });

    it('keeps a room private to non-owners (404, not 403 — existence is hidden)', async () => {
      const owner = await register();
      const outsider = await register();
      const room = (await request(http).post('/api/data-rooms').set(auth(owner.token)).send({ name: 'Vault' }).expect(201)).body;
      await request(http).get(`/api/nodes/root?dataRoomId=${room.id}`).set(auth(outsider.token)).expect(404);
    });
  });

  describe('authorization — negative paths', () => {
    it('refuses across owner / invited / outsider / anon', async () => {
      const owner = await register();
      const invited = await register();
      const outsider = await register();
      const h = auth(owner.token);

      const room = (await request(http).post('/api/data-rooms').set(h).send({ name: 'Deal' }).expect(201)).body;
      const shared = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Shared' }).expect(201)).body;
      const inner = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, parentId: shared.id, name: 'Inner' }).expect(201)).body;
      const secret = (await request(http).post('/api/nodes/folders').set(h).send({ dataRoomId: room.id, name: 'Secret' }).expect(201)).body;

      await request(http).get(`/api/nodes/${shared.id}/children`).set(auth(outsider.token)).expect(404);

      const restr = (await request(http)
        .post('/api/shares').set(h)
        .send({ nodeId: shared.id, mode: 'RESTRICTED', grantEmails: [invited.email] })
        .expect(201)).body.share;

      await request(http).get(`/api/nodes/${shared.id}/children`).set(auth(invited.token)).expect(200);
      await request(http).patch(`/api/nodes/${shared.id}`).set(auth(invited.token)).send({ name: 'Hacked' }).expect(403);
      await request(http).patch(`/api/nodes/${inner.id}/move`).set(auth(invited.token)).send({ targetParentId: secret.id }).expect(403);
      await request(http).delete(`/api/nodes/${inner.id}`).set(auth(invited.token)).expect(403);

      const pub = (await request(http).post('/api/shares').set(h).send({ nodeId: shared.id, mode: 'PUBLIC' }).expect(201)).body.share;
      await request(http).get(`/api/shared/${pub.token}/browse?folderId=${secret.id}`).expect(404);

      await request(http).get(`/api/shared/${restr.token}`).set(auth(invited.token)).expect(200);
      await request(http).delete(`/api/shares/${restr.id}`).set(h).expect(200);
      await request(http).get(`/api/shared/${restr.token}`).set(auth(invited.token)).expect(404);

      await request(http).delete(`/api/nodes/${shared.id}`).set(h).expect(200);
      await request(http).get(`/api/shared/${pub.token}/browse`).expect(404);
    });
  });
});
