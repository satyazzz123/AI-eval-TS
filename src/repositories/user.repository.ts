
import type { Pool, PoolClient } from "pg";
import type { AppUser } from "../models";

type DbExecutor = Pool | PoolClient;

export const findUserById = async (
  db: DbExecutor,
  id: number
): Promise<AppUser | null> => {
  const result = await db.query<AppUser>(
    `
    SELECT id, email, display_name, status
    FROM users
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
};
