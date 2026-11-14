import { CreateEvaluationInput, createEvaluationSchema, idSchema, type TestCase,userEvaluationRunSchema,userTestCaseInputSchema ,idValidator} from "../models";
import { RequestHandler } from "express";
import { getTestCasesFromEvaluationId,createEvaluation, createTestCase, createNewEvaluationRun,executeEvaluationRun, requestEvaluationExecution, showEvaluationResultsFromId } from "../services/evaluation.services";

export const getTestCases:RequestHandler=async(req,res)=>{

    
    let result=idSchema.safeParse(req.params.id)

    if(!result.success){
        return res.status(404).json({error:`Please send valid numbe as id`})

    }
    let testCases=await getTestCasesFromEvaluationId(result.data)

    if(testCases.length===0){
        return res.status(200).json({message:`There is no test case in this eval`})
    }

    return res.status(200).json({message:`Found test cases`,testCases})
}

export const createNewEvaluation:RequestHandler=async (req,res)=>{
    let result=createEvaluationSchema.safeParse(req.body)
    if(!result.success){
        return res.status(404).json({error:result.error.issues})
    }
    let evaluation=await createEvaluation(result.data)
    return res.status(200).json({message:`Evaluation Created Successfully`,evaluation})
}

export const createNewTestCase:RequestHandler=async(req,res)=>{
    let result=userTestCaseInputSchema.safeParse(req.body)
    let id=idSchema.safeParse(req.params.id)
    if (!result.success || !id.success) {
    const errorPayload = !result.success 
        ? result.error.issues 
        : id.error; // TypeScript now knows 'id' must have failed here

    return res.status(400).json({ error: errorPayload });
}
    
    let testCase=await createTestCase(id.data,result.data)
    return res.status(200).json({message:`Test Case inserted`,testCase})
}

export const createNewEvaluationRunByUser: RequestHandler = async (req, res) => {

    const evaluationId = idSchema.safeParse(req.params.id);
    const modelId = userEvaluationRunSchema.safeParse(req.body);

    if (!modelId.success || !evaluationId.success) {
        const errorPayload = !modelId.success
            ? modelId.error
            : evaluationId.error;

        return res.status(400).json({ error: errorPayload });
    }

    const evaluationRun = await createNewEvaluationRun(
        modelId.data.modelId,
        evaluationId.data
    );

    return res.status(201).json({
        message: "New EvaluationRun created",
        evaluationRun
    });
};

export const createNewEvaluationResults:RequestHandler=async(req,res)=>{
    let result=idValidator.safeParse(req.params.id)
    if(!result.success){
        return res.status(400).json({error:result.error.issues})
    }
    
    try {
        const queuedRun=await requestEvaluationExecution(result.data)
        return res.status(202).json({message:"Evaluation Run is queued Successfully",...queuedRun})
    } catch (error) {
        if (error instanceof Error ){
            if(error.message==="EVALUATION_RUN_NOT_FOUND"){
                res.status(404).json({error:"Evaluation Not Found"})
            }
            if(error.message==="EVALUATION_RUN_ALREADY_REQUESTED"){
                res.status(409).json({error:"Evaluation run has already been requested"})
            }

            
        }
    }
}


export const showEvaluationResultsFromIdController: RequestHandler = async (
    req,
    res
) => {
    const result = idValidator.safeParse(req.params.id);

    if (!result.success) {
        return res.status(400).json({
            error: result.error.issues
        });
    }

    const evaluationResults = await showEvaluationResultsFromId(result.data);

    return res.status(200).json({
        message: "Evaluation results fetched successfully",
        evaluationResults
    });
};