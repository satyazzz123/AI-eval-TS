import type { AppUser } from "../models";

declare global {
  namespace Express {
    interface User extends AppUser {}
  }
}

export {};