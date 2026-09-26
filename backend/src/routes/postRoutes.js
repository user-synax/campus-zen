import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { protect, optionalAuth } from "../middleware/auth.js";
import { postController } from "../controllers/postController.js";
import { postImageUpload } from "../middleware/upload.js";
import rateLimit from "express-rate-limit";

const router = Router();

const textSchema = z.object({ text: z.string().trim().min(1, "Text required").max(500, "Max 500 characters") });
const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id") });
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const feedLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const interactionLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// create — accepts JSON (text only) or multipart/form-data (text + image)
router.post("/", protect, createLimiter, postImageUpload.single("image"), postController.create);

// single list for profile tabs — author / likedBy / repostedBy (single endpoint per your choice)
const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  author: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  likedBy: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  repostedBy: z.string().regex(/^[a-f\d]{24}$/i).optional(),
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

// comments (replies)
router.post("/:id/replies", protect, interactionLimiter, validate(idParam, "params"), validate(textSchema), postController.createComment);
router.get("/:id/replies", optionalAuth, validate(idParam, "params"), validate(paginationQuery, "query"), postController.getComments);

export default router;
