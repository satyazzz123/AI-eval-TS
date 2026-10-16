import { GeminiRunner } from "../ModelRunner/geminirunner";
import { ModelRunner } from "../models";
import { Evaluator, LlmJudgeBoolSchema } from "./evaluator";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {z} from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
export class LlmasJudge<T> implements Evaluator<T>{

    private googleProvider;

    constructor(
        private schema: z.ZodType<T>,
        apiKey: string
    ) {
        this.googleProvider = createGoogleGenerativeAI({
            apiKey
        });
    }

    async evaluate(actualOutput: string, expectedOutput: string): Promise<T> {
        const prompt = `
        You are a Judge of outputs. You have to judge between a generated
        output and the actual output and figure out if they are
        contextually saying the same.

        Generated output:
        ${actualOutput}

        Actual output:
        ${expectedOutput}
    `;
        const {object}=await generateObject(
            {
                model:this.googleProvider("gemini-3.5-flash-lite"),
                schema:this.schema,
                prompt
            }
        )
        return object as T
    }
}