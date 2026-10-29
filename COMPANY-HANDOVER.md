# Company login handover

Updated 29 October 2026. The approved UI is retained.

## Current behavior

- One login resolves an exact work email, username, employee ID, or user ID to its company. Ambiguous identifiers are rejected.
- Signed sessions select the database. Company data APIs reject unsigned requests and requests for another company. Active account status and current role are checked on each request.
- Administrators and asset managers manage users. Other users may change only their own password. Password updates cannot change roles or create accounts.
- New account identifiers are checked across companies and reserved centrally. Reservations are retained after deletion or failed creation to prevent identifier reuse; an administrator must review any reservation before releasing it.
- New QR codes include the company route. Scanning requires login and uses actual database assets; QR text cannot create a fallback asset. Reprint older QR labels to include the company, especially where asset IDs overlap.
- Settings and Telegram configuration are company-specific. Existing shared browser preferences are not automatically assigned to a company. Telegram tokens are saved on the server and not returned to the browser.
- Company redirects preserve query parameters. Empty dashboard results clear old items.
- Database credentials and session signing keys no longer have hardcoded fallbacks. A private local signing key was generated in ignored `.env.local`; existing sessions must sign in again.
- Page helper exports were corrected and shared machine lists moved into `src/lib/constants/machineCatalog.ts` so the production build passes.

## Verified

Read-only checks confirmed these active registry mappings without changing live records:

| Company | Database | Users | Machines |
| --- | --- | ---: | ---: |
| Sahana | compliance_sahana | 7 | 495 |
| Texplus | compliance_texplus | 6 | 77 |

No conflicting login identifiers were found across the two databases.

Passed:

- `node scripts/test-login-account.cjs`
- `node scripts/test-login-session.cjs`
- `node scripts/test-company-security.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run build -- --webpack`
- `node scripts/test-company-http.cjs` against the local production preview: nine signed-out API reads and three signed-out writes rejected, login and both company dashboard/scan routes served.

The default Turbopack build crashed while starting its CSS worker in this environment. Webpack completed the production build successfully. The default package build command was not changed.

## Before giving the site to customers

1. Deploy with a private random JWT_SECRET (at least 32 characters), the intended MONGODB_URI, and the registry setting documented in `.env.example`. Rotate previously embedded database and Telegram credentials through their providers; removing them from source does not revoke them or remove Git history.
2. Configure each company's Telegram bot and chat destinations separately in Settings or using company-prefixed environment variables. No Telegram messages were sent during verification.
3. Sign in with real accounts for each role at both companies and check asset changes, breakdown creation/assignment/completion, inventory requests, PPM, password changes, logout, and QR scanning. Automated checks and page serving do not replace these complete browser workflows.
4. Confirm and reprint company-scoped QR labels before distributing them. Legacy labels without a company cannot establish the label's original company; they resolve against the signed-in workspace.

The read-only audit is available as `node scripts/audit-company-connections.cjs`. Do not run destructive seeding scripts against customer databases.
