
import {Request,Response,RequestHandler } from "express";
import { type ModelConfig,createModelSchema,idSchema} from "../models";
import { getAllModels,addModelToDb,findModelById,deleteModelById } from "../services/model.services";




export const getModels=async(req:Request,res:Response):Promise<Response>=>{

let existingArray=await getAllModels()
if(existingArray.length!==0){
    return res.status(200).json(existingArray)
   
}
 return res.status(404).json({error:`there are no Models in this DB`})

}

export const addModel:RequestHandler=async (req,res)=>{
    let result=createModelSchema.safeParse(req.body)
    if(!result.success){
        return res.status(400).json({error:result.error.issues})
    }
    
    let model=await addModelToDb(result.data)
    res.status(200).json({message:`Model added succesfully to Db`,model})


}
export const getModelById:RequestHandler=async (req,res)=>{

    let result=idSchema.safeParse(req.params.id)
    if(!result.success){
        return res.status(400).json({error:result.error.issues})
    }

    let foundModel=await findModelById(result.data)
    if(!foundModel){
        return res.status(401).json({error:`Model not present in this new controller`})

    }
    return res.status(201).json({message:`Model found in DB`,foundModel})


}


export const deleteModel:RequestHandler=async (req,res)=>{
    let result=idSchema.safeParse(req.params.id)
    if(!result.success){
        return res.status(404).json({error:result.error.issues})
    }
    
    let deletedItem=await deleteModelById(result.data)
    if(!deletedItem){
        return res.status(404).json({error:`item not found in DB cant be deleted`})
    }
    return res.status(200).json({message:`item deleted successfully`,deletedItem:deletedItem})
}

