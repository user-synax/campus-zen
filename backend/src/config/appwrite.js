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

export function isAppwriteConfigured() {
  return Boolean(process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY && process.env.APPWRITE_BUCKET_ID);
}

export async function uploadToAppwrite(fileBuffer, filename, mimeType) {
  const { storage: st, bucketId: bid } = getStorage();
  if (!st || !bid) throw new Error("Appwrite not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_BUCKET_ID on backend.");

  // node-appwrite expects File or Blob; use File
  const file = new File([fileBuffer], filename, { type: mimeType });
  const created = await st.createFile(bid, ID.unique(), file);
  // get view URL — Appwrite 1.6+ has getFileView, older getFilePreview
  // For public bucket, we can construct view URL: endpoint/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}
  const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/, "");
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const viewUrl = `${endpoint}/storage/buckets/${bid}/files/${created.$id}/view?project=${projectId}`;
  return { fileId: created.$id, viewUrl };
}

export async function deleteFromAppwrite(fileId) {
  const { storage: st, bucketId: bid } = getStorage();
  if (!st || !bid || !fileId) return;
  try {
    await st.deleteFile(bid, fileId);
  } catch {}
}
