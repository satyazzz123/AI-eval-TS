import { Router } from "express";
import { getModels,addModel,deleteModel,getModelById } from "../controllers/model.controller";
import { rateLimitMiddleware } from "../middleware/rateLimiter.middleware";
import { requirePermission } from "../middleware/requirePermission.middleware";
const router = Router();
router.get("/",requirePermission("model:read"),getModels)

router.post("/",requirePermission("model:create"),addModel);

router.get("/:id",requirePermission("model:read"),getModelById)

router.delete("/:id",requirePermission("model:delete"),deleteModel)

export default router;