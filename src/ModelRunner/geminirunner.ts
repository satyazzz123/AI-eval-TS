import { GoogleGenAI } from "@google/genai";
import { ModelRunner } from "../models";
import { toProviderRequestError } from "../errors/providerRequestError";

export class GeminiRunner implements ModelRunner{

    private ai:GoogleGenAI

    constructor(
        public api_key:string,
        private modelName:string
    ){
        this.ai=new GoogleGenAI({apiKey:api_key})
    }

    async generate(input: string): Promise<string> {
        
        try {
            const interaction=await this.ai.models.generateContent({
            // model: this.modelName,
            model:"gemini-3.5-flash-lite",
            contents:input
        })
        if (interaction.text===undefined){
            throw new Error(`Gemini Mode is facing problems`)
        }
        return interaction.text
            
        } catch (error) {
            throw toProviderRequestError(error,"gemini-generation")
        }

        
    }
}