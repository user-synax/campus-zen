import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";
import { extractMentions } from "./mentions.js";

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log("connected, backfilling mentions…");
  let updatedPosts = 0;
  let scannedPosts = 0;
  const postCursor = Post.find({ mentions: { $exists: false } }).cursor();
  for await (const post of postCursor) {
    scannedPosts += 1;
    post.mentions = extractMentions(post.text);
    await post.save();
    updatedPosts += 1;
    if (updatedPosts % 100 === 0) console.log(`posts …${updatedPosts} updated / ${scannedPosts} scanned`);
  }
  let updatedComments = 0;
  let scannedComments = 0;
  const commentCursor = Comment.find({ mentions: { $exists: false } }).cursor();
  for await (const comment of commentCursor) {
    scannedComments += 1;
    comment.mentions = extractMentions(comment.text);
    await comment.save();
    updatedComments += 1;
    if (updatedComments % 100 === 0) console.log(`comments …${updatedComments} updated / ${scannedComments} scanned`);
  }
  console.log(`done: ${updatedPosts} posts, ${updatedComments} comments`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
