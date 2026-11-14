import { PgBoss } from "pg-boss";
import * as dotenv from "dotenv";

dotenv.config();
export const EVALUATION_RETRY_LIMIT = 3;
if (!process.env.DATABASE_URL) {
  throw new Error("Job queue URL not passed");
}

export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: "pgboss",
});

boss.on("error", (error) => {
  console.error("pg-boss error:", error);
});

const evaluationQueueOptions = {
  retryLimit: EVALUATION_RETRY_LIMIT,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
  expireInSeconds: 900,
};

export const initializeBoss = async () => {
  await boss.start();

  // Ensure the queue exists.
  await boss.createQueue("evaluation-runs");

  // Apply retry configuration, including to an existing queue.
  await boss.updateQueue(
    "evaluation-runs",
    evaluationQueueOptions
  );

  console.log("pg-boss initialized");
};