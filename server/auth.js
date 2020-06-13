const express = require("express");
const passport = require("passport");
const logger = require("pino")();
const fetch = require("node-fetch");
const OAuth2Strategy = require("passport-oauth2").Strategy;

const router = express.Router();
const User = require("./models/user");

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: "https://osu.ppy.sh/oauth/authorize",
      tokenURL: "https://osu.ppy.sh/oauth/token",
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "/auth/osu/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const me = await fetch("https://osu.ppy.sh/api/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json());

      const existing = await User.findOne({ userid: me.id });
      if (existing) {
        return done(null, existing);
      }

      const user = new User({
        username: me.username,
        userid: me.id,
        country: me.country_code,
        avatar: me.avatar_url,
        discord: me.discord || "",
      });
      await user.save();
      done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

router.get("/login", passport.authenticate("oauth2"));
router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

router.get(
  "/osu/callback",
  passport.authenticate("oauth2", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication!
    // janky thing to close the login popup window
    res.send("<script>setInterval(window.close)</script>");
  }
);

module.exports = router;
