import { Router } from "express";
import { createNewEvaluation, createNewEvaluationResults,createNewEvaluationRunByUser, createNewTestCase, getTestCases } from "../controllers/evaluation.controller";

const router=Router()

router.get("/:id/test-cases",getTestCases)
router.post("/",createNewEvaluation)
router.post("/:id/test-cases",createNewTestCase)
router.post("/:id/run",createNewEvaluationRunByUser)
router.post("/:id/execute",createNewEvaluationResults)
export default router