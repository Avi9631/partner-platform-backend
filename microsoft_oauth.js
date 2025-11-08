const passport = require("passport");
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const jwt = require("jsonwebtoken");
passport.use(
  new MicrosoftStrategy(
    {
      callbackURL: `http://localhost:3000/auth/microsoft/redirect`, //same URI as registered in Google console portal
      clientID: `da50774a-df2e-4d89-a195-69b2cad9a18e`, //replace with copied value from Google console
      clientSecret: `Enh8Q~l9oSM_NRtR.bSzqTGBsEAXju3WoLPWvc15`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        return done(null, profile);
      } catch (error) {
        done(error);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});