import {number, string, z} from "zod"

export const createModelSchema=z.object({
    name:z.string(),
    provider:z.string()
})

export type createModelInput=z.infer<typeof createModelSchema>

export const idSchema = z.coerce.number().int().positive()

export const modelConfigSchema=z.object({
    id:z.number(),
    name:z.string(),
    provider:z.string()
})

export interface ModelConfig{
    id:number
    name:string
    provider:string
}


export const createTestCaseSchema=z.object({
    id:z.number(),
    evaluation_id:z.number(),
    input:z.string(),
    expected_output:z.string()
})

export type TestCase=z.infer<typeof createTestCaseSchema>  

export const evaluationTypeSchema = z.enum(["exact", "llm_judge"]);
export type EvaluationType = z.infer<typeof evaluationTypeSchema>;
export const createEvaluationSchema=z.object({
    name:z.string().min(1),
    description:z.string().optional(),
    evaluation_type:evaluationTypeSchema
    
}) 

export type CreateEvaluationInput =z.infer<typeof createEvaluationSchema>
export interface Evaluations{
    id:number
    name:string
    description:string | null
    evaluation_type:EvaluationType


}

export const userTestCaseInputSchema=z.object({
    input:z.string().min(5),
    expected_output:z.string().min(5)

})

export type userTestInput=z.infer<typeof userTestCaseInputSchema>


export const userEvaluationRunSchema=z.object({
    modelId: z.number().int().positive()

})

export const idValidator=z.coerce.number().int().positive()
export type userEvaluationRunOnModel=z.infer<typeof userEvaluationRunSchema>


export const statusTypes = z.enum([
  "success",
  "pending",
  "failed",
  "running"
]);

export type statusTypes = z.infer<typeof statusTypes>;

export const evaluationScoreStatus = z.object({
  status: statusTypes,
  score: z.number().int().positive()
});


export interface EvaluationRun{
    id:number
    evaluation_id:number
    model_id:number
    status:statusTypes
    score:number | null
    error_message:string|null
    created_at:Date
}

export interface ModelRunner{
    generate<T>(input:string,schema:T):Promise<string|T>
}


export interface EvaluationResult{
    id:number
    runId:number
    testCaseId:number
    actualOutput:string
    passed:boolean
    

}


