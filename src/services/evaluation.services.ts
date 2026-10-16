import {type evaluationResultPromiseResolverType, type statusTypes ,type TestCase,type CreateEvaluationInput, Evaluations, userTestInput, EvaluationRun, EvaluationResult } from "../models";
import { findTestCaseEvaluationById, insertEvaluation ,insertTestCase,createEvaluationRun, getEvaluationRunById, createNewEvaluationResults, getAllEvaluationResults, updateEvaluationRuns, getEvaluationById} from "../repositories/evaluation.repository";
import { findModelById } from "./model.services";
import { FallBackRunner } from "../ModelRunner/fallbackrunner";
import * as dotenv from "dotenv";
import { GeminiRunner } from "../ModelRunner/geminirunner";
import { getRunner } from "../ModelRunner/runnerResolver";
import { LlmasJudge } from "../Evaluator/llmJudgeEvaluator";
import { LlmJudgeBoolSchema } from "../Evaluator/evaluator";
import { ExactMatchEvaluator } from "../Evaluator/exactMatchEvaluator";
import { pool } from "../config/database";
import { runWithConcurrency } from "../helpers/concurrencyManager";
dotenv.config()
const apiKey = process.env.GEMINI_API_KEY;

export const getTestCasesFromEvaluationId=async(id:number):Promise<TestCase[]>=>{
    return await findTestCaseEvaluationById(pool,id)
}

export const createEvaluation=async(evaluation:CreateEvaluationInput):Promise<Evaluations>=>{
    return await insertEvaluation(pool,evaluation)
}

export const createTestCase=async(id:number,test:userTestInput):Promise<TestCase>=>{
    return await insertTestCase(pool,id,test)
}

export const createNewEvaluationRun=async(modelId:number,evaluationId:number):Promise<EvaluationRun>=>{
    return await createEvaluationRun(pool,modelId,evaluationId)
}

export const getEvaluationRunFromId=async(id:number):Promise<EvaluationRun|undefined>=>{
return await getEvaluationRunById(pool,id)
}
export const executeEvaluationRun = async (
    evaluationRunId: number
): Promise<EvaluationResult[]> => {

    const evaluationRun = await getEvaluationRunById(pool,evaluationRunId);

    if (evaluationRun === undefined) {
        throw new Error("No evaluation run exists");
    }

    const model = await findModelById(evaluationRun.model_id);

    if (model === undefined) {
        throw new Error("Model doesn't exist");
    }

    const testCases = await getTestCasesFromEvaluationId(
        evaluationRun.evaluation_id
    );

    if (testCases.length === 0) {
        throw new Error("No test cases exist");
    }

    // Mark run as started.
    // This does not need to be part of the transaction.
    await updateEvaluationRuns(
        pool,
        evaluationRunId,
        null,
        "running",
        null
    );

    const runner = getRunner(model);

    const evaluation = await getEvaluationById(
        pool,
        evaluationRun.evaluation_id
    );

    if (evaluation === undefined) {
        throw new Error("Evaluation doesn't exist");
    }

    let promiseResults: evaluationResultPromiseResolverType[];

    try {


    promiseResults = await runWithConcurrency(
    testCases,
    2,
    async (testCase) => {

        const generatedOutput = await runner.generate(
            testCase.input,
            model.name
        );

        let passed = false;

        if (evaluation.evaluation_type === "llm_judge") {

            const llmJudge = new LlmasJudge(
                LlmJudgeBoolSchema,
                process.env.GEMINI_API_KEY!
            );

            passed = (
                await llmJudge.evaluate(
                    generatedOutput,
                    testCase.expected_output
                )
            ).judgement;

        } else {

            const exactCheck = new ExactMatchEvaluator();

            passed = await exactCheck.evaluate(
                generatedOutput,
                testCase.expected_output
            );
        }

        return {
            testCaseId: testCase.id,
            actualOutput: generatedOutput,
            passed
        };
    }
);
    } catch (error) {

        const message =
            error instanceof Error
                ? error.message
                : "Unknown error has occurred";

        await updateEvaluationRuns(
            pool,
            evaluationRunId,
            0,
            "failed",
            message
        );

        throw error;
    }

    /*
     * Phase 2:
     * Persist all results atomically.
     */
    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        for (const result of promiseResults) {

            await createNewEvaluationResults(
                client,
                evaluationRunId,
                result.testCaseId,
                result.actualOutput,
                result.passed
            );
        }

        const results = await getAllEvaluationResults(
            client,
            evaluationRunId
        );

        const passedCount = results.filter(
            result => result.passed
        ).length;

        const score = passedCount / results.length;

        await updateEvaluationRuns(
            client,
            evaluationRunId,
            score * 100,
            "success",
            null
        );

        await client.query("COMMIT");

        return results;

    } catch (error) {

        await client.query("ROLLBACK");

        const message =
            error instanceof Error
                ? error.message
                : "Unknown error has occurred";

        // This happens after ROLLBACK, so this update
        // is NOT part of the failed transaction.
        await updateEvaluationRuns(
            pool,
            evaluationRunId,
            0,
            "failed",
            message
        );

        throw error;

    } finally {

        client.release();
    }
};

