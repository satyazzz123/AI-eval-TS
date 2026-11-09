import { Pool, PoolClient } from "pg";


type DbExecutor=Pool|PoolClient



export const hasPermission = async (
  db: DbExecutor,
  userId: number,
  permissionName: string
): Promise<boolean> => {
  const result = await db.query<{ has_permission: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp
        ON rp.role_id = ur.role_id
      JOIN permissions p
        ON p.id = rp.permission_id
      WHERE ur.user_id = $1
        AND p.name = $2
    ) AS has_permission
    `,
    [userId, permissionName]
  );

  return result.rows[0].has_permission;
};