import { AppError } from "./AppError.js";

// Whole years between dob and today, using the same UTC calendar rules as the
// rest of the app. Returns -1 for an unparseable date.
export function calcAgeYears(dob) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

export function parseDobInput(input) {
  if (typeof input !== "string") {
    throw new AppError("Date of birth required (YYYY-MM-DD)", 400, "INVALID_DOB");
  }
  const s = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new AppError("Date of birth must be YYYY-MM-DD", 400, "INVALID_DOB");
  }
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new AppError("Invalid date of birth", 400, "INVALID_DOB");
  }
  if (d.getTime() > Date.now()) {
    throw new AppError("Date of birth can't be in the future", 400, "INVALID_DOB");
  }
  const age = calcAgeYears(d);
  if (age > 120) throw new AppError("Invalid date of birth", 400, "INVALID_DOB");
  return d;
}
