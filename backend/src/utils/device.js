// Best-effort device description for the "signed-in devices" list. Deliberately
// simple: no UA database, just enough for a user to recognise their own phone
// or laptop. Anything unrecognised falls back to a generic label.
const PLATFORMS = [
  [/iphone|ipad|ipod/i, "iOS"],
  [/android/i, "Android"],
  [/windows/i, "Windows"],
  [/macintosh|mac os x/i, "macOS"],
  [/cros/i, "ChromeOS"],
  [/linux/i, "Linux"],
];

const BROWSERS = [
  [/edg\//i, "Edge"],
  [/opr\/|opera/i, "Opera"],
  [/chrome|crios/i, "Chrome"],
  [/firefox|fxios/i, "Firefox"],
  [/safari/i, "Safari"],
];

function firstMatch(list, value) {
  for (const [re, name] of list) {
    if (re.test(value)) return name;
  }
  return "";
}

function cleanIp(value) {
  const ip = String(value || "").replace(/^::ffff:/, "").trim();
  return ip ? ip.slice(0, 64) : null;
}

export function describeRequest(req) {
  const userAgent = String(req?.headers?.["user-agent"] || "").slice(0, 500);
  const platform = firstMatch(PLATFORMS, userAgent);
  const browser = firstMatch(BROWSERS, userAgent);
  return {
    device: {
      userAgent,
      platform,
      label: [browser, platform].filter(Boolean).join(" on ") || "Unknown device",
    },
    ip: cleanIp(req?.ip || req?.socket?.remoteAddress),
  };
}
