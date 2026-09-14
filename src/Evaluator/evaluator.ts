import {z} from "zod"

export interface Evaluator<T>{
    evaluate(actualOutput:string,expectedOutput:string):Promise<T>
}

export const LlmJudgeBoolSchema=z.object({
reasoning:z.string().nullable().describe("Reason Behind your Judgement"),
judgement:z.boolean().describe("Answer if either generated output and actual output contextually and conceptually similar")
})