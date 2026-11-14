
import { boss, initializeBoss } from "../config/pgboss";
import { registerTestWorker } from "../workers/test.worker";

const main = async () => {
  try {
    await initializeBoss();
    await boss.createQueue("test-jobs");

    let resolveProcessed!: () => void;

    const processed = new Promise<void>((resolve) => {
      resolveProcessed = resolve;
    });

    await registerTestWorker(resolveProcessed);

    const jobId = await boss.send("test-jobs", {
      message: "Hello from AI Evaluation Backend!",
      submittedAt: new Date().toISOString(),
    });

    if (!jobId) {
      throw new Error("Job was not enqueued");
    }

    console.log("Job submitted successfully!");
    console.log("Job ID:", jobId);

    await processed;

    console.log("Smoke test completed successfully!");
  } finally {
    await boss.stop();
  }
};

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exitCode = 1;
});
