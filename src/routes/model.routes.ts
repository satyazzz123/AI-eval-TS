import { Router } from "express";
import { getModels,addModel,deleteModel,getModelById } from "../controllers/model.controller";
import { rateLimitMiddleware } from "../middleware/rateLimiter.middleware";
const router = Router();
router.get("/",rateLimitMiddleware,getModels)

router.post("/",addModel);

router.get("/:id",getModelById)

router.delete("/:id",deleteModel)

export default router;