const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
passport.use(
  new GoogleStrategy(
    {
      callbackURL: process.env.GOOGLE_CALLBACK_URL, //same URI as registered in Google console portal
      clientID: `464005159463-df8gfae917jn76f37p8ssmn9hl7jdi5v.apps.googleusercontent.com`, //replace with copied value from Google console
      clientSecret: `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`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // let user_email = profile.emails && profile.emails[0].value; //profile object has the user info
        // let [user] = await db("users")
        //   .select(["id", "name", "email"])
        //   .where("email", user_email); //check whether user exist in database
        // let redirect_url = "";
        // if (user) {
        //   const token = jwt.sign(user, process.env.JWT_SECRET, {
        //     expiresIn: "1h",
        //   }); //generating token
        //   redirect_url = `http://localhost:3000/${token}`; //registered on FE for auto-login
        //   return done(null, redirect_url); //redirect_url will get appended to req.user object : passport.js in action
        // } else {
        //   redirect_url = `http://localhost:3000/user-not-found/`; // fallback page
        //   return done(null, redirect_url);
        // }

 

        // const user = { googleId: profile.id, name: profile.displayName };
        return done(null, profile);
      } catch (error) {
        done(error);
      }
    }
  )
);
