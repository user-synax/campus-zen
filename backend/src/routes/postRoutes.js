import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { postController } from "../controllers/postController.js";
import { postMediaFields } from "../middleware/upload.js";
import rateLimit from "express-rate-limit";

const router = Router();

const textSchema = z.object({ text: z.string().trim().min(1, "Text required").max(500, "Max 500 characters") });
const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
const usernameParam = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/i, "Invalid username"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/i, "Invalid slug"),
});
const articleBodySchema = z.object({
  title: z.string().trim().min(1, "Title required").max(120, "Max 120 characters"),
  description: z.string().trim().max(200, "Max 200 characters").optional().default(""),
  body: z.string().trim().min(1, "Body required").max(50000, "Max 50000 characters"),
});
const articleUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(50000).optional(),
}).refine((v) => v.title !== undefined || v.description !== undefined || v.body !== undefined, { message: "Nothing to update" });
const lookupSchema = z.object({
  refs: z.array(z.object({
    username: z.string().min(1).max(20),
    slug: z.string().min(1).max(100),
  })).max(10),
});
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const feedLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const interactionLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// create — accepts JSON (text only) or multipart/form-data (text + media[] + posters[] + mediaMeta)
router.post("/", protect, createLimiter, postMediaFields, postController.create);

// articles — must sit before /:id so Express matches them first
router.post("/articles", protect, createLimiter, postMediaFields, validate(articleBodySchema), postController.createArticle);
router.get("/articles", optionalAuth, feedLimiter, validate(paginationQuery, "query"), postController.listArticles);
router.post("/articles/lookup", optionalAuth, interactionLimiter, validate(lookupSchema), postController.lookupArticles);
router.get("/articles/:username/:slug", optionalAuth, validate(usernameParam, "params"), postController.getArticleBySlug);
router.patch("/articles/:id", protect, validate(idParam, "params"), validate(articleUpdateSchema), postController.updateArticle);

// single list for profile tabs — author / likedBy / repostedBy (single endpoint per your choice)
const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  author: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  likedBy: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  repostedBy: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  kind: z.enum(["post", "article"]).optional(),
});
router.get("/", optionalAuth, feedLimiter, validate(listQuery, "query"), postController.list);

// feed — protected following
router.get("/feed", protect, feedLimiter, validate(paginationQuery, "query"), postController.feed);

// public discovery — optional auth for isLiked flags
router.get("/public", optionalAuth, feedLimiter, validate(paginationQuery, "query"), postController.publicFeed);

// single post — optional auth
router.get("/:id", optionalAuth, validate(idParam, "params"), postController.getById);
router.patch("/:id", protect, validate(idParam, "params"), validate(textSchema), postController.update);
router.delete("/:id", protect, validate(idParam, "params"), postController.remove);

// interactions
router.post("/:id/like", protect, interactionLimiter, validate(idParam, "params"), postController.toggleLike);
router.delete("/:id/like", protect, interactionLimiter, validate(idParam, "params"), postController.toggleLike);
router.post("/:id/repost", protect, interactionLimiter, validate(idParam, "params"), postController.toggleRepost);
router.delete("/:id/repost", protect, interactionLimiter, validate(idParam, "params"), postController.toggleRepost);
router.post("/:id/bookmark", protect, interactionLimiter, validate(idParam, "params"), postController.toggleBookmark);
router.delete("/:id/bookmark", protect, interactionLimiter, validate(idParam, "params"), postController.toggleBookmark);

// polls — single-choice, changeable until expiry
const voteSchema = z.object({ optionIndex: z.coerce.number().int().min(0).max(3) });
router.post("/:id/vote", protect, interactionLimiter, validate(idParam, "params"), validate(voteSchema), postController.vote);

// comments (replies)
router.post("/:id/replies", protect, interactionLimiter, validate(idParam, "params"), validate(textSchema), postController.createComment);
router.get("/:id/replies", optionalAuth, validate(idParam, "params"), validate(paginationQuery, "query"), postController.getComments);

export default router;
