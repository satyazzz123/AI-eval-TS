import express from "express"
import "dotenv/config";
import modelRouter from "./routes/model.routes";
import { pool } from "./config/database";
import { errorHandler } from "./middleware/error.middleware";
import evaluationRouter from "./routes/evaluation.routes"
import authRouter from "./routes/auth.routes"
import { rateLimitMiddleware } from "./middleware/rateLimiter.middleware";
import { sessionMiddleware } from "./config/session";
import passport from "passport";
import "./config/passport";
import { authMiddleware } from "./middleware/requireAuth.middleware";

const app=express()
app.use(express.json());
app.use(sessionMiddleware);
app.get("/",(req,res)=>{
    res.send("default path ")
})
app.use(passport.initialize());
app.use(passport.session());

pool.query("SELECT NOW()")
    .then(result => {
        console.log("Database connected:", result.rows[0]);
    })
    .catch(error => {
        console.error("Database connection failed:", error);
    });
// app.use(rateLimitMiddleware)
app.use("/models", authMiddleware,modelRouter);
app.use("/evaluations",authMiddleware,evaluationRouter)
app.use("/auth",authRouter)
app.get("/test-error", (req, res) => {
    throw new Error("Something went terribly wrong");
});
app.use(errorHandler);
app.listen(3000,()=>{
    console.log("Connected to backend");
    
})
