import express from "express"
import "dotenv/config";
import modelRouter from "./routes/model.routes";
import { pool } from "./config/database";
import { errorHandler } from "./middleware/error.middleware";
import evaluationRouter from "./routes/evaluation.routes"


const app=express()
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("default path ")
})

pool.query("SELECT NOW()")
    .then(result => {
        console.log("Database connected:", result.rows[0]);
    })
    .catch(error => {
        console.error("Database connection failed:", error);
    });
app.use("/models", modelRouter);
app.use("/evaluations",evaluationRouter)
app.get("/test-error", (req, res) => {
    throw new Error("Something went terribly wrong");
});
app.use(errorHandler);
app.listen(3000,()=>{
    console.log("Connected to backend");
    
})
