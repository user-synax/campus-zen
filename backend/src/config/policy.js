// DPDP notice/consent versions. Bump these when the legal text changes so
// existing users are asked to re-consent on their next write.
export const POLICY_VERSION = "2026-10-29";
export const TERMS_VERSION = "2026-10-29";
export const PRIVACY_VERSION = "2026-10-29";

// DPDP treats anyone under 18 as a child. CampusZen allows 13-17 only with
// verifiable guardian consent; under-13 accounts are not permitted.
export const MIN_AGE = 13;
export const ADULT_AGE = 18;

export const CONSENT_PURPOSES = ["core", "analytics"];

export const GRIEVANCE_EMAIL = "privacy@campuszen.tech";
export const GRIEVANCE_RESPONSE_DAYS = 30;
