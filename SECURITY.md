# Security Policy

## Supported Versions

CampusZen does not use versioned releases yet. Security fixes are applied to the latest code on the `main` branch only.

| Version              | Supported |
| -------------------- | --------- |
| `main` (latest)      | Yes       |
| Older commits / forks | No        |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, pull requests, or discussions.

Report privately using either of these:

1. **GitHub private reporting (preferred):** open the repository's **Security** tab and click **Report a vulnerability**.
2. **Email:** user-synax@proton.me

Please include:

- A description of the issue and its potential impact
- Steps to reproduce (affected endpoint or page, request/payload, environment)
- Any proof of concept, logs, or screenshots that help

### What to expect

- **Acknowledgement:** within 72 hours of your report.
- **Updates:** at least once every 7 days until the issue is resolved.
- **If accepted:** we will work on a fix, release it, and credit you in the release notes if you wish.
- **If declined:** we will explain why the report is not considered a vulnerability.

Please give us reasonable time to fix the issue before any public disclosure.

## Scope

In scope: the CampusZen frontend (Next.js) and backend API (Express) in this repository, including authentication, OTP flows, sessions/cookies, uploads, and admin endpoints.

Out of scope: third-party services (Appwrite, MongoDB Atlas, Gmail SMTP), social engineering, denial-of-service via volumetric traffic, and issues in unmodified forks or self-hosted deployments run by others.

## Safe Harbor

Good-faith security research that follows this policy, avoids accessing or modifying other users' data, and does not disrupt the service will not be pursued legally.
