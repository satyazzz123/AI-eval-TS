import { type TestCase } from "../models";

export const runWithConcurrency = async <T>(
    testCases: TestCase[],
    concurrency: number,
    processTestCase: (testCase: TestCase) => Promise<T>
): Promise<T[]> => {

    const results: T[] = [];
    
    let index = 0;

    async function worker() {
        while (index < testCases.length) {

            const currentIndex = index;
            index++;
            
            
            const testCase = testCases[currentIndex];
            
            
            console.log(`Starting test case ${testCase.id}`);
            
            const result = await processTestCase(testCase);
            
            console.log(`Finished test case ${testCase.id}.`);
            results[currentIndex] = result;
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, testCases.length) },
        () => worker()
    );

    await Promise.all(workers);

    return results;
};