import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@dataroom.dev';
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User', passwordHash },
  });

  const room = await prisma.dataRoom.create({
    data: { name: 'Acme Acquisition', ownerId: user.id },
  });
  const rootId = uuid();
  const root = await prisma.node.create({
    data: {
      id: rootId,
      type: 'FOLDER',
      name: room.name,
      dataRoomId: room.id,
      parentId: null,
      path: `/${rootId}/`,
    },
  });
  await prisma.dataRoom.update({ where: { id: room.id }, data: { rootId } });

  const folder = (name: string, parent: { id: string; path: string }) => {
    const id = uuid();
    return prisma.node.create({
      data: {
        id,
        type: 'FOLDER',
        name,
        dataRoomId: room.id,
        parentId: parent.id,
        path: `${parent.path}${id}/`,
      },
    });
  };

  const financials = await folder('Financials', root);
  await folder('2024', financials);
  await folder('Legal', root);

  console.log(
    `Seeded user ${email} (password: password123) with room "${room.name}"`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
