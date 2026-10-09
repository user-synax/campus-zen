import { postService } from "../services/postService.js";
import { analyticsService } from "../services/analyticsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const postController = {
  // Author-only insights overview — totals + top posts over 24h / 7d.
  overview: asyncHandler(async (req, res) => {
    const result = await analyticsService.overview(req.user._id, req.query.range);
    res.json({ success: true, data: result });
  }),

  recordView: asyncHandler(async (req, res) => {
    const result = await postService.recordView(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),
  list: asyncHandler(async (req, res) => {
    const { author, likedBy, repostedBy, kind, page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.list({ author, likedBy, repostedBy, kind, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  listRepliesByUser: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.listRepliesByUser(req.params.id, { page, limit });
    res.json({ success: true, data: result });
  }),

  create: asyncHandler(async (req, res) => {
    let poll = req.body.poll;
    // multipart (media upload) delivers fields as strings — accept JSON-encoded poll/meta
    if (typeof poll === "string") {
      try {
        poll = JSON.parse(poll);
      } catch {
        poll = undefined;
      }
    }
    let meta = req.body.mediaMeta;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = undefined;
      }
    }
    if (!Array.isArray(meta)) meta = undefined;
    // new multi-field upload (media[] + posters[]) or legacy single image
    const filesObj = req.files || null;
    let mediaInput = null;
    if (filesObj && (filesObj.media?.length || filesObj.image?.length)) {
      mediaInput = {
        files: [...(filesObj.media || []), ...(filesObj.image || [])].slice(0, 4),
        posters: filesObj.posters || [],
        meta,
      };
    } else if (req.file) {
      mediaInput = req.file;
    }
    const post = await postService.create(req.user._id, req.body.text, mediaInput, poll);
    res.status(201).json({ success: true, data: { post } });
  }),

  createArticle: asyncHandler(async (req, res) => {
    let meta = req.body.mediaMeta;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = undefined;
      }
    }
    if (!Array.isArray(meta)) meta = undefined;
    const filesObj = req.files || null;
    let mediaInput = null;
    if (filesObj && (filesObj.media?.length || filesObj.image?.length)) {
      mediaInput = {
        files: [...(filesObj.media || []), ...(filesObj.image || [])].slice(0, 4),
        posters: filesObj.posters || [],
        meta,
      };
    } else if (req.file) {
      mediaInput = req.file;
    }
    const { post } = await postService.createArticle(
      req.user._id,
      { title: req.body.title, description: req.body.description, body: req.body.body },
      mediaInput,
    );
    res.status(201).json({ success: true, data: { post } });
  }),

  updateArticle: asyncHandler(async (req, res) => {
    const post = await postService.updateArticle(req.params.id, req.user._id, {
      title: req.body.title,
      description: req.body.description,
      body: req.body.body,
    });
    res.json({ success: true, data: { post } });
  }),

  getArticleBySlug: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const post = await postService.getArticleBySlug(req.params.username, req.params.slug, viewerId);
    res.json({ success: true, data: { post } });
  }),

  listArticles: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const result = await postService.listArticles({ page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),

  lookupArticles: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const refs = Array.isArray(req.body?.refs) ? req.body.refs : [];
    const result = await postService.lookupArticles(refs, viewerId);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const post = await postService.getById(req.params.id, viewerId);
    res.json({ success: true, data: { post } });
  }),

  update: asyncHandler(async (req, res) => {
    const post = await postService.update(req.params.id, req.user._id, req.body.text);
    res.json({ success: true, data: { post } });
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await postService.remove(req.params.id, req.user._id);
    res.json({ success: true, ...result });
  }),

  feed: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.feed(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  publicFeed: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.publicFeed({ page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),

  toggleLike: asyncHandler(async (req, res) => {
    // POST = ensure liked (idempotent), DELETE = ensure unliked (idempotent).
    // Same URL keeps backward compat, but burst retries no longer 409 or flip.
    const result =
      req.method === "DELETE"
        ? await postService.unlikePost(req.user._id, req.params.id)
        : await postService.likePost(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  toggleRepost: asyncHandler(async (req, res) => {
    const result =
      req.method === "DELETE"
        ? await postService.unrepostPost(req.user._id, req.params.id)
        : await postService.repostPost(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  toggleBookmark: asyncHandler(async (req, res) => {
    const result =
      req.method === "DELETE"
        ? await postService.unbookmarkPost(req.user._id, req.params.id)
        : await postService.bookmarkPost(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  vote: asyncHandler(async (req, res) => {
    const result = await postService.vote(req.user._id, req.params.id, req.body.optionIndex);
    res.json({ success: true, data: result });
  }),

  createComment: asyncHandler(async (req, res) => {
    const result = await postService.createComment(req.user._id, req.params.id, req.body.text);
    res.status(201).json({ success: true, data: result });
  }),

  getComments: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.getComments(req.params.id, { page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),
};
