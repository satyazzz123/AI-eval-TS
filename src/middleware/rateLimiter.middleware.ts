import type { RequestHandler } from "express";
import type { RateLimitRecord } from "../models";

// 1. Declare ipMap outside so it persists across requests
const ipMap = new Map<string, RateLimitRecord>();

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
    const now = new Date();
    const ipOfUser = req.ip;

    if (!ipOfUser) {
        throw new Error("Cannot work without the IP");
    }

    const WINDOW_SIZE_MS = 60 * 1000; // 60 seconds in milliseconds
    const MAX_REQUESTS = 5;

    let record = ipMap.get(ipOfUser);

    if (!record) {  
       
        record = {
            count: 1,
            windowStart: now,
            currentTimeStamp: now,
        };
        ipMap.set(ipOfUser, record);
    } else {
        // Calculate time difference in milliseconds
        const timeDiff = now.getTime() - record.windowStart.getTime();

        if (timeDiff > WINDOW_SIZE_MS) {
            
            record.windowStart = now;
            record.count = 1;
        } else {
            
            record.count += 1;

            if (record.count > MAX_REQUESTS && timeDiff < WINDOW_SIZE_MS) {
                res.status(429).json({ error: "Rate limit has reached" });
                return;
            }
        }

        record.currentTimeStamp = now;
        
    }

    next();
};