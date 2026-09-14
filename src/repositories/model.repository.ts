import { pool } from "../config/database";
import { ModelConfig } from "../models";
import { type createModelInput } from "../models"; 

export const findAll=async ():Promise<Array<ModelConfig>>=>{
    const result= await pool.query(
        "SELECT * FROM models"
    )

    return result.rows
}

export const insertModel=async (model:createModelInput):Promise<ModelConfig>=>{
    const result=await pool.query(
        `INSERT INTO models (name, provider)
         VALUES ($1, $2)
         RETURNING *`,
        [model.name, model.provider]
    )
    return result.rows[0]
}

export const getModelFromId=async(id:number):Promise<ModelConfig|undefined>=>{
    const result=await pool.query(
        `SELECT *
         FROM models
         WHERE id = $1`,
        [id]
    )
    return result.rows[0]
}

export const deleteModelFromDbWithId=async(id:number):Promise<ModelConfig>=>{

    const result=await pool.query(
        `DELETE FROM MODELS
        WHERE id=$1
        RETURNING *`,
        [id]
        
        
        
    )
    return result.rows[0]
}