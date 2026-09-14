import { Router } from "express";
import { getModels,addModel,deleteModel,getModelById } from "../controllers/model.controller";
const router = Router();
router.get("/",getModels)

router.post("/",addModel);

router.get("/:id",getModelById)

router.delete("/:id",deleteModel)

export default router;