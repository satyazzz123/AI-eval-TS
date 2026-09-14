import { ModelRunner } from "../models";

export class FallBackRunner implements ModelRunner{
    async generate(input:string):Promise<string>{
        return `This is a fallack Generation there must be some error`
    }
}