import { Router } from "express";
import passport from "passport";
const router=Router()

router.get("/",(req,res)=>{
    res.status(200).json({message:"auth registres"})
})

// Step 1: Redirect the user to GitHub for authentication.
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

// Step 2: GitHub redirects back here after authorization.
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/auth/login-failed",
    successRedirect: "/auth/me",
  })
);

// Step 3: Return the currently authenticated user.
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: "Not authenticated",
    });
  }

  res.json({
    user: req.user,
  });
});

// Step 4: Handle failed authentication.
router.get("/login-failed", (_req, res) => {
  res.status(401).json({
    error: "GitHub authentication failed",
  });
});

// Step 5: Log out and destroy the session.
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      res.clearCookie("ai_eval.sid");
      res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
});

export default router;
