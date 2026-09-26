import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Post } from "../models/Post.js";
import { extractHashtags } from "./hashtags.js";

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log("connected, backfilling hashtags…");
  const cursor = Post.find({ $or: [{ hashtags: { $exists: false } }, { hashtags: { $size: 0 } }] }).cursor();
  let updated = 0;
  let scanned = 0;
  for await (const post of cursor) {
    scanned += 1;
    const tags = extractHashtags(post.text);
    // only write when different to avoid churn
    const current = post.hashtags || [];
    if (current.length === tags.length && current.every((t, i) => t === tags[i])) continue;
    post.hashtags = tags;
    await post.save();
    updated += 1;
    if (updated % 100 === 0) console.log(`…${updated} updated / ${scanned} scanned`);
  }
  console.log(`done: ${updated} updated, ${scanned} scanned`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
