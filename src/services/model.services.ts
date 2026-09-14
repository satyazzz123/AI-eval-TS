import { Mode } from "node:fs"
import { type ModelConfig ,type createModelInput } from "../models"
import { deleteModelFromDbWithId, findAll,getModelFromId,insertModel } from "../repositories/model.repository"


export const getAllModels=async ():Promise<Array<ModelConfig>>=> {
    
    let models=await findAll()
    return models

}

export const  addModelToDb=async (modelInput:createModelInput):Promise<ModelConfig>=>{
    return await insertModel(modelInput)
   
}


export const findModelById=async (id:number):Promise<ModelConfig|undefined>=>{

    let model=await getModelFromId(id)
    return model
}

export const deleteModelById=async(id:number):Promise<ModelConfig|undefined>=>{

    const deletedModel=await deleteModelFromDbWithId(id)
    if (!deletedModel){
        return
    }
    
    return deletedModel
}