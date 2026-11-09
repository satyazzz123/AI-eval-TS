import { pool, } from "../config/database";
import { GitHubIdentity,AppUser } from "../models";
import { Pool, PoolClient } from "pg";
type DbExecutor = Pool | PoolClient;



export const findGithubUser = async (
    db: DbExecutor,
    github: GitHubIdentity
): Promise<AppUser|null> => {
    const result = await db.query<AppUser>(
        `
        SELECT u.id, u.email, u.display_name, u.status
        FROM users u
        JOIN oauth_accounts oa ON oa.user_id = u.id
        WHERE oa.provider = 'github'
          AND oa.provider_user_id = $1
        `,
        [github.id]
    );

    return result.rows[0]??null
};

export const insertUser=async (db:DbExecutor,github:GitHubIdentity):Promise<AppUser>=>{

    const create=await db.query<AppUser>(
        `
        INSERT INTO users (email,display_name)
        VALUES ($1,$2)
        RETURNING id,email,display_name,status

        `,
        [github.email,github.displayName??github.username]
    )

    return create.rows[0]
}

export const insertGithubAccount=async(user:AppUser,db:DbExecutor,github:GitHubIdentity):Promise<void>=>{

    await db.query(
        `
        INSERT INTO oauth_accounts
            (user_id,provider,provider_user_id,provider_username)
        VALUES($1,'github',$2,$3)
        `,
        [user.id,github.id,github.username]
    )
}

export const assignMemberRole=async(user:AppUser,db:DbExecutor):Promise<void>=>{
    let result=await db.query(
        `
        INSERT INTO user_roles(user_id,role_id)
        SELECT $1,id
        FROM roles
        WHERE name='member'
        `,
        [user.id]
    )
    if (result.rowCount !== 1) {
    throw new Error("Member role is missing or could not be assigned");
}
}