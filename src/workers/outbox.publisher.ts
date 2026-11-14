import { pool } from "../config/database";
import { boss } from "../config/pgboss";

interface OutboxEvent {
    id: number;
    event_type: string;
    payload: {
        evaluationRunId: number;
    };
}

export const publishOutboxEvents = async () => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query<OutboxEvent>(
            `
            SELECT id, event_type, payload
            FROM outbox_events
            WHERE published_at IS NULL
            ORDER BY id
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            `
        );

        const event = result.rows[0];

        if (!event) {
            await client.query("COMMIT");
            return;
        }

        if (event.event_type !== "evaluation.run.requested") {
            throw new Error(
                `Unsupported outbox event: ${event.event_type}`
            );
        }

        await boss.send(
            "evaluation-runs",
            event.payload
        );

        await client.query(
            `
            UPDATE outbox_events
            SET published_at = NOW()
            WHERE id = $1
            `,
            [event.id]
        );

        await client.query("COMMIT");

        console.log(`Outbox event ${event.id} published`);

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};

export const startOutboxPublisher = async () => {
    console.log("Outbox publisher started");

    while (true) {
        try {
            await publishOutboxEvents();
        } catch (error) {
            console.error("Outbox publishing failed:", error);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
};