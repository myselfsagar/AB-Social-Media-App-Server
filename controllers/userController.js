const Post = require("../models/Post");
const User = require("../models/User");
const { mapPostOutput } = require("../utils/Utils");
const { error, success } = require("../utils/responseWrapper");
const cloudinary = require("cloudinary").v2;

const followOrUnfollowUserController = async (req, res) => {
  try {
    const { userIdToFollow } = req.body;
    const curUserId = req._id;

    const userToFollow = await User.findById(userIdToFollow);
    const curUser = await User.findById(curUserId);

    if (userIdToFollow === curUserId) {
      return res.send(success(409, "Users can not follow to themselves!"));
    }

    if (!userToFollow) {
      return res.send(error(404, "User to follow not found!"));
    }

    if (curUser.followings.includes(userIdToFollow)) {
      const followingIndex = curUser.followings.indexOf(userIdToFollow);
      curUser.followings.splice(followingIndex, 1);

      const followerIndex = userToFollow.followers.indexOf(curUserId);
      userToFollow.followers.splice(followerIndex, 1);
    } else {
      curUser.followings.push(userIdToFollow);
      userToFollow.followers.push(curUserId);
    }
    await curUser.save();
    await userToFollow.save();

    return res.send(success(200, { user: userToFollow }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const getPostsOfFollowingsController = async (req, res) => {
  try {
    const curUserId = req._id;
    const curUser = await User.findById(curUserId).populate("followings");

    const allPosts = await Post.find({
      owner: {
        $in: curUser.followings,
      },
    }).populate("owner");

    const posts = allPosts
      .map((item) => mapPostOutput(item, curUserId))
      .reverse();

    const followingIds = curUser.followings.map((following) => following._id);
    followingIds.push(curUserId);

    const suggestions = await User.find({
      _id: {
        $nin: followingIds,
      },
    });

    return res.send(success(200, { ...curUser._doc, suggestions, posts }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const getMyPostsController = async (req, res) => {
  try {
    const curUserId = req._id;

    //go to post model and fetch those posts whose owner is login user
    const posts = await Post.find({
      owner: curUserId,
    }).populate("likes");

    //go to the login user then his posts array and fetch the post for each post id
    // const postsArray = await curUser.posts;
    // const posts = await Post.find({
    //   _id: postsArray.map((post) => post),
    // });
    return res.send(success(200, posts));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const getUserPosts = async (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.send(error(400, "user id is required"));
    }

    const posts = await Post.find({
      owner: userId,
    }).populate("likes");

    res.send(success(200, posts));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const deleteMyProfileController = async (req, res) => {
  try {
    const curUserId = req._id;
    const curUser = await User.findById(curUserId);

    //delete me from all posts I liked
    const allPosts = await Post.find().select("-__v");
    allPosts.forEach(async (post) => {
      const index = post.likes.indexOf(curUserId);
      if (index > -1) {
        post.likes.splice(index, 1);
        await post.save();
      }
    });

    // delete my all posts
    await Post.deleteMany({
      owner: curUserId,
    });

    //remove from my followers' followings list
    curUser.followers.forEach(async (followerId) => {
      const follower = await User.findById(followerId).select("-__v");
      // if we dont remove __v, will get error: Version Error: No matching document found for id
      //Mongo DB has a version control system in place. This helps ensure that if you save an object once, when saving it again you don't end up overwriting the previously saved data.

      const index = follower.followings.indexOf(curUserId);
      if (index > -1) {
        follower.followings.splice(index, 1);
        await follower.save();
      }
    });

    //remove from my followings' followers list
    curUser.followings.forEach(async (followingId) => {
      const following = await User.findById(followingId).select("-__v");

      const index = following.followers.indexOf(curUserId);
      if (index > -1) {
        following.followers.splice(index, 1);
        await following.save();
      }
    });

    //delete me from database
    await curUser.deleteOne();

    //clear my cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
    });
    return res.send(success(200, "User deleted"));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const getMyInfo = async (req, res) => {
  try {
    const user = await User.findById(req._id);
    return res.send(success(200, { user }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, bio, userImg } = req.body;

    const user = await User.findById(req._id);

    if (name) {
      user.name = name;
    }
    if (bio) {
      user.bio = bio;
    }
    if (userImg) {
      const cloudImg = await cloudinary.uploader.upload(userImg, {
        folder: "profileImg",
      });
      user.avatar = {
        url: cloudImg.secure_url,
        publicId: cloudImg.public_id,
      };
    }
    await user.save();
    return res.send(success(200, { user }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.body.userId;

    const user = await User.findById(userId).populate({
      path: "posts",
      populate: {
        path: "owner",
      },
    });

    const allPosts = user.posts;

    const posts = allPosts
      .map((item) => mapPostOutput(item, req._id))
      .reverse();

    return res.send(success(200, { ...user._doc, posts }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
  const user = await User;
};
module.exports = {
  followOrUnfollowUserController,
  getPostsOfFollowingsController,
  getMyPostsController,
  getUserPosts,
  deleteMyProfileController,
  getMyInfo,
  updateUserProfile,
  getUserProfile,
};
