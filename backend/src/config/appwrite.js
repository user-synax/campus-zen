import { Client, Storage, ID } from "node-appwrite";
import { env } from "./env.js";

let storage = null;
let bucketId = null;

function getStorage() {
  if (storage) return { storage, bucketId };

  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  bucketId = process.env.APPWRITE_BUCKET_ID;

  if (!endpoint || !projectId || !apiKey || !bucketId) {
    return { storage: null, bucketId: null };
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  storage = new Storage(client);
  return { storage, bucketId };
}

function resolveBucket(mimeType) {
  // Optional split bucket for videos; falls back to the main bucket so
  // existing deployments keep working with zero env changes.
  if (mimeType && String(mimeType).startsWith("video/") && process.env.APPWRITE_VIDEO_BUCKET_ID) {
    return process.env.APPWRITE_VIDEO_BUCKET_ID;
  }
  return bucketId;
}

export function extractFileId(url) {
  if (!url) return null;
  const m = String(url).match(/\/files\/([^/]+)\//);
  return m ? m[1] : null;
}
export function isAppwriteConfigured() {
  return Boolean(process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY && process.env.APPWRITE_BUCKET_ID);
}

export async function uploadToAppwrite(fileBuffer, filename, mimeType) {
  const { storage: st, bucketId: bid } = getStorage();
  if (!st || !bid) throw new Error("Appwrite not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_BUCKET_ID on backend.");

  const targetBucket = resolveBucket(mimeType) || bid;
  // node-appwrite expects File or Blob; use File
  const file = new File([fileBuffer], filename, { type: mimeType });
  const created = await st.createFile(targetBucket, ID.unique(), file);
  // get view URL — Appwrite 1.6+ has getFileView, older getFilePreview
  // For public bucket, we can construct view URL: endpoint/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}
  const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/, "");
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const viewUrl = `${endpoint}/storage/buckets/${targetBucket}/files/${created.$id}/view?project=${projectId}`;
  return { fileId: created.$id, viewUrl, bucketId: targetBucket };
}

export async function deleteFromAppwrite(fileId, bucket = null) {
  const { storage: st, bucketId: bid } = getStorage();
  if (!st || !bid || !fileId) return;
  const targets = bucket ? [bucket] : [bid, process.env.APPWRITE_VIDEO_BUCKET_ID].filter(Boolean);
  for (const b of targets) {
    try {
      await st.deleteFile(b, fileId);
      return;
    } catch {}
  }
}
