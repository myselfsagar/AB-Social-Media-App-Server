const jwt = require("jsonwebtoken");
const { success, error } = require("../utils/responseWrapper");
const User = require("../models/User");

const requireUser = async (req, res, next) => {
  if (
    !req.headers ||
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer")
  ) {
    // return res.status(401).send('Authorization header is required');
    return res.send(error(401, "Authorization header is required"));
  }
  const accessToken = req.headers.authorization.split(" ")[1];

  try {
    const decode = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_PRIVATE_KEY
    );
    req._id = decode._id;
    const user = await User.findById(req._id);

    if (!user) {
      return res.send(error(404, "User not found!"));
    }

    next();
  } catch (err) {
    console.log(err);
    // return res.status(401).send('Invalid access key');
    return res.send(error(401, "Invalid access token"));
  }
};

module.exports = requireUser;
