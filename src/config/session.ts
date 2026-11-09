
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./database";

const PgSessionStore = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured");
}

export const sessionMiddleware = session({
    name: "ai_eval.sid",
    store: new PgSessionStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: false
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
});
