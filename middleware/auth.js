const passport = require('passport');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
require('dotenv').config()

const secret = process.env.JWT_SECRET;

const { Strategy, ExtractJwt } = require("passport-jwt");

// EXTRACTS JWT TOKEN FROM HEADER 
const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secret,
};

// AUTHENTICATES USER
const strategy = new Strategy(options, async (jwt_payload, done) => {
    console.log('IN STRATEGY')
  try {
    const user = await User.findById(jwt_payload.id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(strategy);
passport.initialize();

// AUTHORIZE ROUTES
const requireToken = passport.authenticate("jwt", { session: false });

// CREATE JWT TOKEN
const createUserToken = (req, user) => {
  if (
    !user ||
    !req.body.password ||
    !bcrypt.compareSync(req.body.password, user.password)
  ) {
    const err = new Error("The provided username or password is incorrect");
    err.statusCode = 422;
    throw err;
  }
  return jwt.sign({ id: user._id }, secret, { expiresIn: 36000 });
};

module.exports = {
  requireToken,
  createUserToken,
};
