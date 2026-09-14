import { GoogleGenAI } from "@google/genai";
import { ModelRunner } from "../models";

export class GeminiRunner implements ModelRunner{

    private ai:GoogleGenAI

    constructor(
        public api_key:string,
        private modelName:string
    ){
        this.ai=new GoogleGenAI({apiKey:api_key})
    }

    async generate(input: string): Promise<string> {
        
        

        const interaction=await this.ai.models.generateContent({
            // model: this.modelName,
            model:"gemini-2.5-flash",
            contents:input
        })
        if (interaction.text===undefined){
            throw new Error(`Gemini Mode is facing problems`)
        }
        return interaction.text
    }
}