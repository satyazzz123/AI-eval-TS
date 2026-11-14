
import { boss } from "../config/pgboss";

export const registerTestWorker = async (
  onProcessed: () => void
) => {
  await boss.work("test-jobs", async ([job]) => {
    console.log("Worker picked up a job!");
    console.log("Job ID:", job.id);
    console.log("Job payload:", job.data);

    console.log("Test job processed successfully!");

    onProcessed();

    return {
      success: true,
      message: "Job processed",
    };
  });
};
