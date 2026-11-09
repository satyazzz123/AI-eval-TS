
import type { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { hasPermission } from "../repositories/authorization.repository";
import { AppUser } from "../models";

export const requirePermission = (permissionName: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      const userId = req.user .id;

      const allowed = await hasPermission(
        pool,
        userId,
        permissionName
      );

      if (!allowed) {
        return res.status(403).json({
          error: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
