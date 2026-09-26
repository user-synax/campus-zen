import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { Like } from "../models/Like.js";
import { Repost } from "../models/Repost.js";
import { Follow } from "../models/Follow.js";
import { User } from "../models/User.js";
import { notificationService } from "./notificationService.js";
import { blockService } from "./blockService.js";
import { AppError } from "../utils/AppError.js";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

// strip posts whose author is blocked (either direction) from a fetched list
async function withoutBlockedAuthors(posts, viewerId) {
  if (!viewerId || !posts.length) return posts;
  const hidden = await blockService.blockedIdsFor(viewerId);
  if (!hidden.length) return posts;
  const set = new Set(hidden.map(String));
  return posts.filter((p) => !set.has(String(p.author?._id || p.author)));
}

export const postService = {
  async create(authorId, text, imageFile) {
    const t = text?.trim() || "";
    if (t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    if (!t && !imageFile) throw new AppError("Post must have text or an image", 400, "EMPTY_POST");

    let imageUrl = null;
    if (imageFile) {
      const { isAppwriteConfigured, uploadToAppwrite } = await import("../config/appwrite.js");
      if (!isAppwriteConfigured()) throw new AppError("Image upload not configured", 503, "APPWRITE_NOT_CONFIGURED");
      const uploaded = await uploadToAppwrite(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
      imageUrl = uploaded.viewUrl;
    }

    const post = await Post.create({ author: authorId, text: t || undefined, imageUrl });
    await User.findByIdAndUpdate(authorId, { $inc: { postCount: 1 } });
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified");
    return populated;
  },

  async getById(postId, viewerId) {
    const post = await Post.findById(postId).populate("author", "fullName username avatarUrl isEmailVerified").lean();
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    // blocked in either direction → indistinguishable from deleted
    if (viewerId) {
      const authorId = post.author?._id || post.author;
      if (await blockService.isBlocked(viewerId, authorId)) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    if (viewerId) {
      const [liked, reposted] = await Promise.all([
        Like.exists({ user: viewerId, post: postId }),
        Repost.exists({ user: viewerId, post: postId }),
      ]);
      post.isLiked = Boolean(liked);
      post.isReposted = Boolean(reposted);
    }
    return post;
  },

  async update(postId, userId, text) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to edit this post", 403, "FORBIDDEN");
    if (Date.now() - new Date(post.createdAt).getTime() > EDIT_WINDOW_MS) throw new AppError("Edit window expired (5 minutes)", 403, "EDIT_WINDOW_EXPIRED");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Post must be 1-500 characters", 400, "INVALID_TEXT");
    post.text = t;
    post.edited = true;
    await post.save();
    const populated = await Post.findById(post._id).populate("author", "fullName username avatarUrl isEmailVerified");
    return populated;
  },

  async remove(postId, userId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (String(post.author) !== String(userId)) throw new AppError("Not authorized to delete this post", 403, "FORBIDDEN");
    await Post.deleteOne({ _id: postId });
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } }),
      Comment.deleteMany({ post: postId }),
      Like.deleteMany({ post: postId }),
      Repost.deleteMany({ post: postId }),
    ]);
    // clamp
    await User.updateOne({ _id: userId, postCount: { $lt: 0 } }, { $set: { postCount: 0 } });
    // cleanup image from Appwrite
    if (post.imageUrl) {
      try {
        const { deleteFromAppwrite } = await import("../config/appwrite.js");
        const fileId = post.imageUrl.match(/\/files\/([^/]+)\//)?.[1];
        if (fileId) await deleteFromAppwrite(fileId);
      } catch {}
    }
    return { message: "Post deleted" };
  },

  async feed(userId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    // get following ids + self, minus blocked authors
    const follows = await Follow.find({ follower: userId }).select("following").lean();
    const ids = follows.map((f) => f.following);
    ids.push(userId);
    const hidden = await blockService.blockedIdsFor(userId);
    const authorFilter = hidden.length ? { $in: ids, $nin: hidden } : { $in: ids };
    const [posts, total] = await Promise.all([
      Post.find({ author: authorFilter })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("author", "fullName username avatarUrl isEmailVerified")
        .lean(),
      Post.countDocuments({ author: authorFilter }),
    ]);
    // add isLiked/isReposted
    if (posts.length && userId) {
      const postIds = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: userId, post: { $in: postIds } }).select("post").lean(),
        Repost.find({ user: userId, post: { $in: postIds } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
    }
    return { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  async publicFeed({ page = 1, limit = 20 }, viewerId) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const hidden = viewerId ? await blockService.blockedIdsFor(viewerId) : [];
    const filter = hidden.length ? { author: { $nin: hidden } } : {};
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified").lean(),
      Post.countDocuments(filter),
    ]);
    if (posts.length && viewerId) {
      const postIds = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
        Repost.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
    }
    return { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  async toggleLike(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Like.findOne({ user: userId, post: postId });
    if (existing) {
      await Like.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });
      await Post.updateOne({ _id: postId, likeCount: { $lt: 0 } }, { $set: { likeCount: 0 } });
      const updated = await Post.findById(postId).select("likeCount");
      return { liked: false, likeCount: updated.likeCount };
    } else {
      try {
        await Like.create({ user: userId, post: postId });
      } catch (e) {
        if (e.code === 11000) throw new AppError("Already liked", 409, "ALREADY_LIKED");
        throw e;
      }
      await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });
      if (String(post.author) !== String(userId)) {
        try {
          await notificationService.create({ recipient: post.author, actor: userId, type: "like", post: postId });
        } catch {}
      }
      const updated = await Post.findById(postId).select("likeCount");
      return { liked: true, likeCount: updated.likeCount };
    }
  },

  async toggleRepost(userId, postId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const existing = await Repost.findOne({ user: userId, post: postId });
    if (existing) {
      await Repost.deleteOne({ _id: existing._id });
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: -1 } });
      await Post.updateOne({ _id: postId, repostCount: { $lt: 0 } }, { $set: { repostCount: 0 } });
      const updated = await Post.findById(postId).select("repostCount");
      return { reposted: false, repostCount: updated.repostCount };
    } else {
      try {
        await Repost.create({ user: userId, post: postId });
      } catch (e) {
        if (e.code === 11000) throw new AppError("Already reposted", 409, "ALREADY_REPOSTED");
        throw e;
      }
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } });
      if (String(post.author) !== String(userId)) {
        try {
          await notificationService.create({ recipient: post.author, actor: userId, type: "repost", post: postId });
        } catch {}
      }
      const updated = await Post.findById(postId).select("repostCount");
      return { reposted: true, repostCount: updated.repostCount };
    }
  },

  async createComment(userId, postId, text) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    await blockService.assertNoBlock(userId, post.author, "You can't interact with this account's posts.");
    const t = text.trim();
    if (!t || t.length > 500) throw new AppError("Reply must be 1-500 characters", 400, "INVALID_TEXT");
    const comment = await Comment.create({ post: postId, author: userId, text: t });
    await Post.findByIdAndUpdate(postId, { $inc: { replyCount: 1 } });
    if (String(post.author) !== String(userId)) {
      try {
        await notificationService.create({ recipient: post.author, actor: userId, type: "reply", post: postId });
      } catch {}
    }
    const populated = await Comment.findById(comment._id).populate("author", "fullName username avatarUrl isEmailVerified");
    const updatedPost = await Post.findById(postId).select("replyCount");
    return { comment: populated, replyCount: updatedPost.replyCount };
  },

  async getComments(postId, { page = 1, limit = 20 }, viewerId = null) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    if (viewerId && (await blockService.isBlocked(viewerId, post.author))) {
      throw new AppError("Post not found", 404, "POST_NOT_FOUND");
    }
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const [comments, total] = await Promise.all([
      Comment.find({ post: postId }).sort({ createdAt: 1 }).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified").lean(),
      Comment.countDocuments({ post: postId }),
    ]);
    return { comments, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  // single endpoint for profile tabs — author / likedBy / repostedBy
  async list({ author, likedBy, repostedBy, page = 1, limit = 20, viewerId }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    let filter = {};
    let sort = { createdAt: -1 };
    let postIds = null;

    if (likedBy) {
      const likes = await Like.find({ user: likedBy }).sort({ createdAt: -1 }).skip(skip).limit(lim).select("post").lean();
      postIds = likes.map((l) => l.post);
      if (postIds.length === 0) return { posts: [], total: await Like.countDocuments({ user: likedBy }), page: Number(page), limit: lim, hasMore: false };
      filter = { _id: { $in: postIds } };
      // preserve like order
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      if (viewerId) ordered = await withoutBlockedAuthors(ordered, viewerId);
      // add isLiked/isReposted
      if (viewerId && ordered.length) {
        const ids = ordered.map((p) => p._id);
        const [likes, reposts] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reposts.map((r) => String(r.post)));
        ordered.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
      }
      const total = await Like.countDocuments({ user: likedBy });
      return { posts: ordered, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    }

    if (repostedBy) {
      const reposts = await Repost.find({ user: repostedBy }).sort({ createdAt: -1 }).skip(skip).limit(lim).select("post").lean();
      postIds = reposts.map((r) => r.post);
      if (postIds.length === 0) return { posts: [], total: await Repost.countDocuments({ user: repostedBy }), page: Number(page), limit: lim, hasMore: false };
      filter = { _id: { $in: postIds } };
      const posts = await Post.find(filter).populate("author", "fullName username avatarUrl isEmailVerified").lean();
      const map = new Map(posts.map((p) => [String(p._id), p]));
      let ordered = postIds.map((id) => map.get(String(id))).filter(Boolean);
      if (viewerId) ordered = await withoutBlockedAuthors(ordered, viewerId);
      if (viewerId && ordered.length) {
        const ids = ordered.map((p) => p._id);
        const [likes, reps] = await Promise.all([
          Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
          Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
        ]);
        const likeSet = new Set(likes.map((l) => String(l.post)));
        const repostSet = new Set(reps.map((r) => String(r.post)));
        ordered.forEach((p) => {
          p.isLiked = likeSet.has(String(p._id));
          p.isReposted = repostSet.has(String(p._id));
        });
      }
      const total = await Repost.countDocuments({ user: repostedBy });
      return { posts: ordered, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
    }

    if (author) {
      filter.author = author;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter).sort(sort).skip(skip).limit(lim).populate("author", "fullName username avatarUrl isEmailVerified").lean(),
      Post.countDocuments(filter),
    ]);

    if (posts.length && viewerId) {
      const ids = posts.map((p) => p._id);
      const [likes, reposts] = await Promise.all([
        Like.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
        Repost.find({ user: viewerId, post: { $in: ids } }).select("post").lean(),
      ]);
      const likeSet = new Set(likes.map((l) => String(l.post)));
      const repostSet = new Set(reposts.map((r) => String(r.post)));
      posts.forEach((p) => {
        p.isLiked = likeSet.has(String(p._id));
        p.isReposted = repostSet.has(String(p._id));
      });
    }

    return { posts, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },

  async listRepliesByUser(authorId, { page = 1, limit = 20 }) {
    const lim = Math.max(1, Math.min(50, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;
    const [comments, total] = await Promise.all([
      Comment.find({ author: authorId }).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("post", "text author createdAt").populate("author", "fullName username avatarUrl isEmailVerified").lean(),
      Comment.countDocuments({ author: authorId }),
    ]);
    // also populate post author for context
    const populated = await Promise.all(
      comments.map(async (c) => {
        if (c.post && c.post.author) {
          const pa = await User.findById(c.post.author).select("fullName username avatarUrl").lean();
          c.post.author = pa;
        }
        return c;
      })
    );
    return { comments: populated, total, page: Number(page), limit: lim, hasMore: skip + lim < total };
  },
};
