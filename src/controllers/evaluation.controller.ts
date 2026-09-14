import { CreateEvaluationInput, createEvaluationSchema, idSchema, type TestCase,userEvaluationRunSchema,userTestCaseInputSchema ,idValidator} from "../models";
import { RequestHandler } from "express";
import { getTestCasesFromEvaluationId,createEvaluation, createTestCase, createNewEvaluationRun,executeEvaluationRun } from "../services/evaluation.services";

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
    let evalResults=await executeEvaluationRun(result.data)
    if(evalResults.length===0){
        return res.status(200).json({error:"There are no evaluation Results"})
    }
    return res.status(200).json({message:"WE have your REsults",evalResults})
}