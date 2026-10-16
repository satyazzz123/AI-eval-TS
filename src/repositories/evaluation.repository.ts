import { type TestCase ,type Evaluations ,type CreateEvaluationInput,type userTestInput, userEvaluationRunOnModel, EvaluationRun, EvaluationResult, statusTypes } from "../models";
import { pool } from "../config/database"
import { Pool, PoolClient } from "pg";

type DbExecutor = Pool | PoolClient;
export const findTestCaseEvaluationById=async (db:DbExecutor ,id:number):Promise<TestCase[]>=>{
    const result = await db.query(
        `SELECT *
         FROM test_cases
         WHERE evaluation_id = $1
         ORDER BY id`,
        [id]
    );
    
    return result.rows


}

export const insertEvaluation=async(db:DbExecutor,evaluation:CreateEvaluationInput):Promise<Evaluations>=>{
    const result=await db.query(
        `
        INSERT INTO evaluations (name,description,evaluation_type)
        VALUES ($1,$2,$3)
        RETURNING * `,
        [evaluation.name,evaluation.description??null,evaluation.evaluation_type]
    )
    return result.rows[0]
}

export const getEvaluationById=async(db:DbExecutor,evaluationId:number):Promise<Evaluations>=>{
    const result=await db.query(
        `
        SELECT * 
        FROM evaluations
        WHERE id=$1
        `,
        [evaluationId]
    )
    return result.rows[0]
}

export const insertTestCase=async(db:DbExecutor,id:number,test:userTestInput):Promise<TestCase>=>{
    const result=await db.query(
        `
        INSERT INTO test_cases
            (evaluation_id,input,expected_output)
        VALUES ($1,$2,$3)
        RETURNING *
        `,
        [id,test.input,test.expected_output]
    )
    return result.rows[0]
}

export const createEvaluationRun=async(db:DbExecutor,model_id:number,evaluation_id:number):Promise<EvaluationRun>=>{

    const result=await db.query(
        `INSERT INTO evaluation_runs
            (model_id,evaluation_id)
         VALUES ($1,$2)
         RETURNING *
        `,
        [model_id,evaluation_id]
    )
    return result.rows[0]
}

export const getEvaluationRunById=async(db:DbExecutor,id:number):Promise<EvaluationRun|undefined>=>{
    const result=await db.query(
        `SELECT * FROM evaluation_runs
         WHERE id=$1
        `,
        [id]
    )
    return result.rows[0]
}
export const getAllEvaluationResults=async(db:DbExecutor,runId:number):Promise<EvaluationResult[]>=>{
    const result=await db.query(
        `
        SELECT * FROM evaluation_results
        WHERE run_id=$1
        `,
        [runId]
    )
    return result.rows
}

export const createNewEvaluationResults=async(db:DbExecutor,runId:number,testCaseId:number,actualOutput:string,passed:boolean)=>{
   await db.query(
        `
        INSERT INTO evaluation_results
            (run_id,test_case_id,actual_output,passed)
        VALUES($1,$2,$3,$4)
        
        `,
        [runId,testCaseId,actualOutput,passed]
    )
    
}

export const updateEvaluationRuns = async (
    db:DbExecutor,
    runId: number,
    score: number | null,
    status: statusTypes,
    errorMessage: string | null
): Promise<EvaluationRun> => {

    const result = await db.query(
        `
        UPDATE evaluation_runs
        SET status = $2,
            score = $3,
            error_message=$4
        WHERE id = $1
        RETURNING *
        `,
        [runId, status, score,errorMessage]
    );

    return result.rows[0];
};