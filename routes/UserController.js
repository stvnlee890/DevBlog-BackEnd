const router = require("express").Router();
const User = require("../model/User");
const bcrypt = require("bcrypt");
const { createUserToken } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// HASH PW WHEN USER SIGNS UP
router.post("/signup", async (req, res, next) => {
  console.log(req.body);

  try {
    const password = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ ...req.body, password });
    console.log(req.body);
    return res.status(201).json({ body: user, status: true });
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

// CREATE TOKEN IF USER isAdmin
router.post("/login", async (req, res, next) => {
  try {
    const user = await User.findOne(
      { username: req.body.username } || { password: req.password }
    );
    if (user.isAdmin) {
      const token = createUserToken(req, user);
      res.status(201).json({ token, user });
    } else {
      res.json({ user });
    }
  } catch (error) {
    next(error);
  }
});
module.exports = router;
