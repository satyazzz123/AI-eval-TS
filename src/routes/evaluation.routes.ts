import { Router } from "express";
import { createNewEvaluation, createNewEvaluationResults,createNewEvaluationRunByUser, createNewTestCase, getTestCases } from "../controllers/evaluation.controller";
import { rateLimitMiddleware } from "../middleware/rateLimiter.middleware";
import { requirePermission } from "../middleware/requirePermission.middleware";
const router=Router()

router.get("/:id/test-cases",requirePermission("evaluation:read"),getTestCases)
router.post("/",requirePermission("evaluation:create"),createNewEvaluation)
router.post("/:id/test-cases",requirePermission("evaluation:create"),createNewTestCase)
router.post("/:id/run",requirePermission("evaluation:run"),createNewEvaluationRunByUser)
router.post("/:id/execute",requirePermission("evaluation:run"),createNewEvaluationResults)
export default router