const ADJECTIVES = [
  "Silent", "Curious", "Brave", "Mellow", "Witty", "Calm", "Eager", "Gentle",
  "Bold", "Clever", "Quiet", "Swift", "Kind", "Lucky", "Nimble", "Patient",
  "Bright", "Chill", "Daring", "Honest", "Jolly", "Keen", "Lively", "Misty",
];

const ANIMALS = [
  "Panther", "Owl", "Fox", "Panda", "Tiger", "Falcon", "Wolf", "Koala",
  "Raven", "Deer", "Otter", "Eagle", "Badger", "Cobra", "Dolphin", "Sparrow",
  "Leopard", "Bison", "Crane", "Dove", "Elk", "Fennec", "Gecko", "Heron",
];

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateAnonAlias(seed = "") {
  const h = hashString(String(seed || `${Date.now()}-${Math.random()}`));
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(h / ADJECTIVES.length) % ANIMALS.length];
  return `Anonymous ${adj} ${animal}`;
}

// Deterministic alias per user per thread — same user keeps same alias
// across pages/reloads within a thread, different threads get different aliases.
// OP keeps the post's alias (caller passes isOp).
export function aliasForThreadMember(postId, userId, postAlias) {
  const h = hashString(`${String(postId)}:${String(userId)}`);
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(h / ADJECTIVES.length) % ANIMALS.length];
  return `Anonymous ${adj} ${animal}`;
}

export function maskAnonAuthor(anonAlias) {
  return {
    _id: "anonymous",
    fullName: anonAlias || "Anonymous",
    username: "anonymous",
    avatarUrl: null,
    isEmailVerified: false,
    isVerified: false,
    isPro: false,
    isOwner: false,
    isCofounder: false,
    isAnonymousView: true,
  };
}
