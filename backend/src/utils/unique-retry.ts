import { Prisma } from '@prisma/client';

export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

export async function withNameRetry<T>(
  attempt: () => Promise<T>,
  retries = 5,
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (i >= retries || !isUniqueViolation(err)) throw err;
    }
  }
}
