import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
}

// Post attachments: images (jpg/png/webp), GIFs (image/gif) and short
// videos (mp4/webm/mov). Multer's fileSize is a single ceiling — per-type
// limits (5MB image / 10MB GIF / 25MB video) are enforced in postService
// so errors can name the offending type.
const POST_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function postMediaFileFilter(req, file, cb) {
  if (file.fieldname === "posters") {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images, GIFs and videos are allowed"), false);
    }
    return cb(null, true);
  }
  if (!POST_MEDIA_MIMES.has(file.mimetype)) {
    return cb(new Error("Only images, GIFs and videos are allowed"), false);
  }
  cb(null, true);
}

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter,
});

export const postImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter,
});

// Up to 4 attachments per post (field "media") + up to 4 client-generated
// video posters (field "posters", small JPEGs). Legacy single-"image"
// uploads are still accepted by the controller for old clients.
export const postMediaUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 8 },
  fileFilter: postMediaFileFilter,
});

export const postMediaFields = postMediaUpload.fields([
  { name: "media", maxCount: 4 },
  { name: "posters", maxCount: 4 },
  { name: "image", maxCount: 1 },
]);
