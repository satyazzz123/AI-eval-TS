import { Pool,PoolClient } from "pg";

type DbExecutor=Pool| PoolClient

export const createOutboxEvent = async (
    db: DbExecutor,
    eventType: string,
    payload: object
) => {
    const result = await db.query(
        `
        INSERT INTO outbox_events (
            event_type,
            payload
        )
        VALUES ($1, $2)
        RETURNING id, event_type, payload, created_at
        `,
        [eventType, JSON.stringify(payload)]
    );

    return result.rows[0];
};