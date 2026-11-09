import { RequestHandler } from "express";


export const authMiddleware:RequestHandler=(req,res,next)=>{


    if(!req.isAuthenticated()){
        return res.status(401).json({error:"Auhthentication requierd"})
    }

    next()
}