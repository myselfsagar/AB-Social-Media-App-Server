const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { success, error } = require("../utils/responseWrapper");

const signupController = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      // return res.status(400).send('All fields are mandatory!')
      return res.send(error(400, "All fields are mandatory!"));
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      // return res.status(409).send('User is already registered')
      return res.send(error(409, "User is already registered"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // return res.status(201).json({
    //     newUser,
    // })
    return res.send(success(201, "User created successfully."));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      // return res.status(400).send('All fields are required!')
      return res.send(error(400, "All fields are required!"));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      // return res.status(404).send('User is not registered')
      return res.send(error(404, "User is not registered"));
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      // return res.status(403).send('password is incorect');
      return res.send(error(403, "password is incorect"));
    }

    const accessToken = await generateAccessToken({ _id: user._id });

    const refreshToken = await generateRefreshToken({ _id: user._id });

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
    });

    // return (res.json({accessToken}))
    return res.send(success(200, { accessToken }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

// its job is to check the refresh token and generate a new access token
const refreshAccessTokenController = async (req, res) => {
  // const {refreshToken} = req.body;

  // if(!refreshToken) {
  //     return res.status(401).send('Refresh token is mandatory');
  // }

  const cookies = req.cookies;
  if (!cookies.jwt) {
    // res.status(401).send('Refresh token in cookie is required!')
    return res.send(error(401, "Refresh token in cookie is required!"));
  }

  const refreshToken = cookies.jwt;

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_PRIVATE_KEY
    );

    const _id = decoded._id;

    const accessToken = generateAccessToken({ _id });

    // return res.status(201).json({accessToken})
    return res.send(success(201, { accessToken }));
  } catch (err) {
    console.log(err);
    // return res.status(401).send('Invalid refresh token')
    return res.send(error(401, "Invalid refresh token"));
  }
};

const logoutController = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
    });
    return res.send(success(200, "user logged out"));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const generateAccessToken = (data) => {
  try {
    const accessToken = jwt.sign(data, process.env.ACCESS_TOKEN_PRIVATE_KEY, {
      expiresIn: "1d",
    });
    console.log({ accessToken });
    return accessToken;
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const generateRefreshToken = (data) => {
  try {
    const refreshToken = jwt.sign(data, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      expiresIn: "1y",
    });
    console.log({ refreshToken });
    return refreshToken;
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

module.exports = {
  signupController,
  loginController,
  refreshAccessTokenController,
  logoutController,
};
