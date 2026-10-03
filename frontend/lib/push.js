"use client";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, permission: "unsupported", subscribed: false };
  const permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg?.pushManager) return { supported: true, permission, subscribed: false };
    const sub = await reg.pushManager.getSubscription();
    return { supported: true, permission, subscribed: Boolean(sub), endpoint: sub?.endpoint || null };
  } catch {
    return { supported: true, permission, subscribed: false };
  }
}

async function getPublicKey(api) {
  const res = await api.getPushPublicKey();
  return res?.data?.publicKey || res?.publicKey || null;
}

export async function ensureSubscribed(api) {
  if (!isPushSupported()) throw new Error("Push not supported on this browser");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    const err = new Error("Permission denied");
    err.code = "PERMISSION_DENIED";
    throw err;
  }
  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // If an old SW controls the page without /sw.js, update to it.
  if (!reg.active && reg.installing) {
    await new Promise((resolve) => {
      const sw = reg.installing;
      sw.addEventListener("statechange", function onChange() {
        if (sw.state === "activated") {
          sw.removeEventListener("statechange", onChange);
          resolve();
        }
      });
    });
  }
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const publicKey = await getPublicKey(api);
    if (!publicKey) throw new Error("Push not configured on server");
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();
  await api.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    device: { userAgent: navigator.userAgent, platform: navigator.platform || "" },
  });
  return sub;
}

export async function ensureUnsubscribed(api) {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      try {
        await api.unsubscribePush(endpoint);
      } catch {}
      try {
        await sub.unsubscribe();
      } catch {}
      return true;
    }
  } catch {}
  return false;
}
