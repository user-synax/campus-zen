export const ACCENTS = {
  peach: {
    label: "Peach",
    dot: "#ffcead",
    ring: "rgba(255, 206, 173, 0.55)",
    from: "rgba(255, 206, 173, 0.30)",
    to: "rgba(125, 130, 217, 0.32)",
  },
  lavender: {
    label: "Lavender",
    dot: "#b8b3ff",
    ring: "rgba(184, 179, 255, 0.55)",
    from: "rgba(125, 130, 217, 0.45)",
    to: "rgba(125, 130, 217, 0.12)",
  },
  mint: {
    label: "Mint",
    dot: "#7df0b2",
    ring: "rgba(125, 240, 178, 0.5)",
    from: "rgba(125, 240, 178, 0.28)",
    to: "rgba(125, 130, 217, 0.22)",
  },
  sky: {
    label: "Sky",
    dot: "#7cc7ff",
    ring: "rgba(124, 199, 255, 0.5)",
    from: "rgba(124, 199, 255, 0.30)",
    to: "rgba(125, 130, 217, 0.22)",
  },
  rose: {
    label: "Rose",
    dot: "#ff8fa3",
    ring: "rgba(255, 143, 163, 0.5)",
    from: "rgba(255, 143, 163, 0.30)",
    to: "rgba(255, 206, 173, 0.20)",
  }
};

export const ACCENT_KEYS = Object.keys(ACCENTS);

export function accentFor(key) {
  return ACCENTS[key] || ACCENTS.peach;
}
