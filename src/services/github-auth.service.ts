import { pool } from "../config/database";
import type { GitHubIdentity, AppUser } from "../models";
import {
  findGithubUser,
  insertUser,
  insertGithubAccount,
  assignMemberRole,
} from "../repositories/auth.repository";

export const findOrCreateGithubUser = async (
  github: GitHubIdentity
): Promise<AppUser> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check whether this GitHub identity already exists.
    const existingUser = await findGithubUser(client, github);

    if (existingUser) {
      // 2. Do not allow disabled accounts to log in.
      if (existingUser.status !== "active") {
        throw new Error("Account is disabled");
      }

      await client.query("COMMIT");
      return existingUser;
    }

    // 3. Create the internal application user.
    const user = await insertUser(client, github);

    // 4. Link the GitHub identity to the application user.
    await insertGithubAccount(user, client, github);

    // 5. Assign the default member role.
    await assignMemberRole(user, client);

    // 6. Persist all creation operations atomically.
    await client.query("COMMIT");

    return user;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
};
