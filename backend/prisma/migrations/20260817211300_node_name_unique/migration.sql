-- Name uniqueness within a folder: case-insensitive and ignoring soft-deleted
-- nodes, so a delete immediately frees the name. Prisma can't express lower()/
-- WHERE indexes, so this lives in a manual migration. A NULL parentId (a room
-- root) never collides because NULLs compare as distinct in Postgres.
--
-- Two concurrent same-name creates can't both win here (unlike a SELECT-then-
-- INSERT check); the loser hits this index and is mapped to a 409 NAME_CONFLICT.
CREATE UNIQUE INDEX "Node_parentId_lower_name_key"
  ON "Node" ("parentId", lower("name"))
  WHERE "deletedAt" IS NULL;
