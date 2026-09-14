

import { Evaluator } from "./evaluator";

export class ExactMatchEvaluator implements Evaluator<Boolean>{
    async evaluate(actualOutput: string, expectedOutput: string): Promise<boolean> {
        
        return actualOutput===expectedOutput
    }
}