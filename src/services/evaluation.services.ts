import { type statusTypes ,type TestCase,type CreateEvaluationInput, Evaluations, userTestInput, EvaluationRun, EvaluationResult } from "../models";
import { findTestCaseEvaluationById, insertEvaluation ,insertTestCase,createEvaluationRun, getEvaluationRunById, createNewEvaluationResults, getAllEvaluationResults, updateEvaluationRuns, getEvaluationById} from "../repositories/evaluation.repository";
import { findModelById } from "./model.services";
import { FallBackRunner } from "../ModelRunner/fallbackrunner";
import * as dotenv from "dotenv";
import { GeminiRunner } from "../ModelRunner/geminirunner";
import { getRunner } from "../ModelRunner/runnerResolver";
import { LlmasJudge } from "../Evaluator/llmJudgeEvaluator";
import { LlmJudgeBoolSchema } from "../Evaluator/evaluator";
import { ExactMatchEvaluator } from "../Evaluator/exactMatchEvaluator";
dotenv.config()
const apiKey = process.env.GEMINI_API_KEY;
export const getTestCasesFromEvaluationId=async(id:number):Promise<TestCase[]>=>{
    return await findTestCaseEvaluationById(id)
}

export const createEvaluation=async(evaluation:CreateEvaluationInput):Promise<Evaluations>=>{
    return await insertEvaluation(evaluation)
}

export const createTestCase=async(id:number,test:userTestInput):Promise<TestCase>=>{
    return await insertTestCase(id,test)
}

export const createNewEvaluationRun=async(modelId:number,evaluationId:number):Promise<EvaluationRun>=>{
    return await createEvaluationRun(modelId,evaluationId)
}

export const getEvaluationRunFromId=async(id:number):Promise<EvaluationRun|undefined>=>{
return await getEvaluationRunById(id)
}

export const executeEvaluationRun = async (
    evaluationRunId: number
): Promise<EvaluationResult[]> => {

    const evaluationRun = await getEvaluationRunById(evaluationRunId);

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

    // Run has started
    await updateEvaluationRuns(
        evaluationRunId,
        null,
        "running",
        null
    );
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    const runner= getRunner(model)

    const evaluation=await getEvaluationById(evaluationRun.evaluation_id)
    
    try {
        for (const testCase of testCases) {

        const generatedOutput = await runner.generate(
            testCase.input,
            model.name
        );

        let passed=false
        if (evaluation.evaluation_type==="llm_judge"){
            const llmJudge =new LlmasJudge(LlmJudgeBoolSchema,process.env.GEMINI_API_KEY!)
            passed=(await llmJudge.evaluate(generatedOutput,testCase.expected_output)).judgement
        }
        else{
            const exactCheck=new ExactMatchEvaluator()
            passed=await exactCheck.evaluate(generatedOutput,testCase.expected_output)
        }

        

        await createNewEvaluationResults(
            evaluationRunId,
            testCase.id,
            generatedOutput,
            passed
            
        );
    }

    const results = await getAllEvaluationResults(evaluationRunId);

    const passedCount = results.filter(
        result => result.passed
    ).length;

    const score = passedCount / results.length;

    // Run finished successfully
    await updateEvaluationRuns(
        evaluationRunId,
        score,
        "success",
        null
    );

    return results;
        
    } catch (error) {
        const message=error instanceof Error?error.message:"unknown error has occured"
        await updateEvaluationRuns(
        evaluationRunId,
        0,
        "failed",
        message

    );

    throw error;
        
    }

};