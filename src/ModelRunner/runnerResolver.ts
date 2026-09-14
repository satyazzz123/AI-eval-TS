import { ModelConfig, ModelRunner } from "../models";
import { GeminiRunner } from "./geminirunner";
import { FallBackRunner } from "./fallbackrunner";

export const getRunner = (model: ModelConfig): ModelRunner => {
    if (model.provider === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured");
        }
            return new GeminiRunner(apiKey,model.name);
    }

    if (model.provider === "fake") {
        return new FallBackRunner();
    }

    throw new Error(`Unsupported model provider: ${model.provider}`);
};