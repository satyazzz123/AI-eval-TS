
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Profile } from "passport-github2";
import type { VerifyCallback } from "passport-oauth2";

import { pool } from "./database";
import { findOrCreateGithubUser } from "../services/github-auth.service";
import { findUserById } from "../repositories/user.repository";
import type { AppUser } from "../models";

if (
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET ||
  !process.env.GITHUB_CALLBACK_URL
) {
  throw new Error("GitHub OAuth environment variables are missing");
}
async function getGitHubEmail(
  accessToken: string
): Promise<string | null> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve GitHub email");
  }

  const emails: {
    email: string;
    primary: boolean;
    verified: boolean;
  }[] = await response.json();

  const email =
    emails.find((item) => item.primary && item.verified) ??
    emails.find((item) => item.verified);

  return email?.email ?? null;
}
// 1. Register the GitHub OAuth strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ["user:email"],
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = await getGitHubEmail(_accessToken);
        const githubUser = {
          id: String(profile.id),
          email,
          username: profile.username ?? "",
          displayName: profile.displayName || null,
          
        };

        if (!githubUser.username) {
          throw new Error("GitHub profile has no username");
        }

        const user = await findOrCreateGithubUser(githubUser);

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// 2. Serialize: save the internal database user ID in the session
passport.serializeUser((user, done) => {
  const appUser = user as AppUser;
  done(null, appUser.id);
});

// 3. Deserialize: load the user from the database on later requests
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findUserById(pool, id);

    if (!user || user.status !== "active") {
      return done(null, false);
    }

    return done(null, user);
  } catch (error) {
    return done(error as Error);
  }
});
  