import { boss } from "../config/pgboss";
import { pool } from "../config/database";
import { executeEvaluationRun } from "../services/evaluation.services";
import type { EvaluationJobData } from "../models";
import { ProviderRequestError } from "../errors/providerRequestError";
import { claimEvaluationRun, updateEvaluationRuns } from "../repositories/evaluation.repository";
import { EVALUATION_RETRY_LIMIT } from "../config/pgboss";
import { success } from "zod";

export const registerEvaluationWorker = async () => {
  await boss.work<EvaluationJobData>(
    "evaluation-runs",
    async ([job]) => {
      const { evaluationRunId } = job.data;

      console.log("Evaluation job picked up");
      console.log("Job ID:", job.id);
      console.log("Evaluation Run ID:", evaluationRunId);

      try {

        let claimedRun=await claimEvaluationRun(pool,evaluationRunId)
        if(!claimedRun){
          console.log(`Evaluationn RUn id -${evaluationRunId} has already been claimed skipping`);
          return{success:true,skipped:true}
          
        }
        await executeEvaluationRun(evaluationRunId);

        console.log(
          `Evaluation run ${evaluationRunId} completed successfully`
        );

        return {
          success: true,
          evaluationRunId,
        };

      } catch (error) {

        // Handle errors classified by our provider error wrapper.
        if (error instanceof ProviderRequestError) {

          console.log("Provider:", error.provider);
          console.log("Retryable:", error.retryable);
          console.log("Error:", error.message);

      if (error.retryable) {

          console.log("Retry count:", job.retryCount);
          console.log("Configured retry limit:", EVALUATION_RETRY_LIMIT);

          const isFinalAttempt =
              job.retryCount >= EVALUATION_RETRY_LIMIT;

          if (isFinalAttempt) {

              await updateEvaluationRuns(
                  pool,
                  evaluationRunId,
                  null,
                  "failed",
                  error.message
              );

              console.log(
                  `Evaluation run ${evaluationRunId} exhausted all retries`
              );

          } else {

              await updateEvaluationRuns(
                  pool,
                  evaluationRunId,
                  null,
                  "queued",
                  null
              );
          }

          throw error;
      }

          // Permanent provider error: fail the evaluation.
          await updateEvaluationRuns(
            pool,
            evaluationRunId,
            null,
            "failed",
            error.message
          );

          // Acknowledge the job. Do NOT throw.
          return {
            success: false,
            evaluationRunId,
            error: error.message,
          };
        }

        // Unexpected errors: let pg-boss retry for now.
        throw error;
      }
    }
  );

  console.log("Evaluation worker registered");
};