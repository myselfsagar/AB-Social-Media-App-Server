const Post = require("../models/Post");
const User = require("../models/User");
const { success, error } = require("../utils/responseWrapper");
const cloudinary = require("cloudinary").v2;
const { mapPostOutput } = require("../utils/Utils");

const createPostController = async (req, res) => {
  try {
    const curUserId = req._id;
    const curUser = await User.findById(curUserId);

    const { caption, postImg } = req.body;

    if (!caption || !postImg) {
      return res.send(error(400, "caption and postImg are required"));
    }

    const cloudImg = await cloudinary.uploader.upload(postImg, {
      folder: "postImg",
    });

    const owner = curUserId;

    const post = await Post.create({
      owner,
      caption,
      image: {
        url: cloudImg.url,
        publicId: cloudImg.public_id,
      },
    });

    curUser.posts.push(post._id);
    await curUser.save();

    return res.send(success(200, { post }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const likeOrUnlikePostController = async (req, res) => {
  try {
    const { postId } = req.body;
    const curUserId = req._id;

    const post = await Post.findById(postId).populate("owner");
    if (!post) {
      return res.send(error(404, "Post not found!"));
    }

    if (post.likes.includes(curUserId)) {
      const index = post.likes.indexOf(curUserId);
      post.likes.splice(index, 1);
    } else {
      post.likes.push(curUserId);
    }

    await post.save();
    return res.send(success(200, { post: mapPostOutput(post, curUserId) }));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const updatePostController = async (req, res) => {
  try {
    const { postId, caption } = req.body;
    const curUserId = req._id;

    if (!caption) {
      return res.send(error(400, "caption is required"));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.send(error(404, "Post not found"));
    }

    if (post.owner.toString() != curUserId) {
      return res.send(error(403, "Only owners can update their posts"));
    }

    if (caption) {
      post.caption = caption;
    }

    await post.save();

    return res.send(success(200, post));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

const deletePostController = async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId);

    const curUserId = req._id;
    const curUser = await User.findById(curUserId);

    if (!post) {
      return res.send(error(404, "Post not found"));
    }

    if (post.owner.toString() != curUserId) {
      return res.send(error(403, "Only owners can delete their post"));
    }

    const postIndex = curUser.posts.indexOf(postId);
    curUser.posts.splice(postIndex, 1);
    await curUser.save();
    await post.deleteOne();

    return res.send(success(200, "Post deleted successfully"));
  } catch (e) {
    return res.send(error(500, e.message));
  }
};

module.exports = {
  createPostController,
  likeOrUnlikePostController,
  updatePostController,
  deletePostController,
};
