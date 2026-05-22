# PlotKare Verification Workflow

Use this workflow to confirm the dashboard work is actually complete and stable before calling the app market-ready.

## 1) Baseline checks

Run these first from `webpage/`:

```bash
npm install
npm run lint
npm run build
```

Pass criteria:
- `lint` finishes without errors.
- `build` finishes without compile or runtime-route failures.
- Any new TypeScript or route errors are fixed before continuing.

## 2) Local runtime setup

Start the app:

```bash
npm run dev
```

Then verify:
- The app loads on `http://127.0.0.1:3002`.
- Supabase environment variables are present.
- Auth middleware does not redirect valid users in a loop.

## 3) Auth flow verification

Check the following user journeys:

1. New user signup
   - Sign up with minimal fields only.
   - Confirm email callback returns to the correct post-auth page.
   - Confirm no extra onboarding fields appear during first signup.

2. Returning user login
   - Log in with an existing account.
   - Confirm the user skips `/auth/choose-role/` if the account already has a role/profile.
   - Confirm the user lands on the expected dashboard page.

3. Admin login
   - Log in with an admin account.
   - Confirm admin users reach admin dashboard pages and are not blocked by user-only guards.

Pass criteria:
- No auth redirect loop.
- No broken callback route.
- New and returning users land on the correct destination.

## 4) Settings page verification

Open `Dashboard -> Settings` and check each tab.

### Account tab
- Profile loads from `profiles`.
- Full name, phone, and city are editable.
- Save writes back through `/api/profile`.
- Avatar upload works and persists `avatar_path`.
- Reloading the page preserves the updated values.

### Security tab
- Current email is shown from the live auth session.
- Password change validates current password.
- Password mismatch is rejected.
- Email/password updates return a clear success or error state.
- Logout other devices works without breaking the current session.

### Notifications tab
- Toggles reflect stored `notification_preferences`.
- Toggling a preference persists after refresh.
- If a save fails, the previous state is restored.

### Billing tab
- Current plan is loaded from live subscription data.
- Pending consultation state is shown if applicable.
- The call-to-action routes to payments or consultation flow.

Pass criteria:
- No placeholder values remain.
- Data survives refresh.
- All actions produce a clear toast or UI response.

## 5) Payments page verification

Open `Dashboard -> Payments` and check:
- Active plan reflects real user data or a known empty state.
- Consultation status is not hardcoded.
- Any selectable plan changes persist in storage or backend logic as designed.
- The displayed consultation/package history is sourced from live or seeded data, not static mock rows.

Pass criteria:
- No demo-only labels remain unless the page is intentionally seeded for staging.
- The page never shows stale temporary storage as the source of truth.

## 6) Inspection reports verification

Open `Dashboard -> Inspection Reports` and check:
- Reports are fetched from `/api/inspections`.
- Empty state appears when the user has no reports.
- Completed reports show the correct badge.
- Report download works when `report_file_path` exists.
- Photos are shown only when attached.
- The page does not show the old static report array.

Pass criteria:
- The page matches live database contents.
- Download and photo actions do not throw runtime errors.

## 7) Document vault verification

Open `Dashboard -> Document Vault` and check:
- Existing documents load from `/api/documents`.
- Uploading a file creates metadata and storage content.
- Downloading opens the correct file.
- Deleting removes both storage content and metadata.
- Ownership is respected for non-admin users.

Test files:
- PDF
- PNG
- JPG or WebP

Pass criteria:
- Upload, download, and delete all work end to end.
- A refresh after upload still shows the uploaded file.

## 8) API and data integrity checks

Verify these route behaviors with a signed-in user:
- `/api/profile` GET and PATCH
- `/api/inspections` GET
- `/api/documents` GET and POST
- `/api/documents/[id]` DELETE
- `/api/documents/upload-url` POST

What to confirm:
- Unauthorized requests fail cleanly.
- User-scoped requests only return the current user’s records.
- Admin-only flows remain admin-only.
- Validation errors return helpful messages.

## 9) Regression checklist before release

Before shipping, confirm:
- Login, signup, and callback routes still work.
- Dashboard navigation is stable.
- No hardcoded placeholder content remains in production pages.
- No console errors appear during the main workflows.
- No broken links, missing icons, or blank sections on dashboard pages.
- No TypeScript, lint, or build regressions were introduced.

## 10) Release gate

Only mark the build as market-ready if all of the following are true:
- `npm run lint` passes.
- `npm run build` passes.
- Core auth flows pass manually.
- Settings persist to Supabase and survive refresh.
- Billing, reports, and documents show live user data.
- No placeholder UI remains on customer-facing dashboard screens.

If any step fails, fix the root cause and rerun the same checks before moving on.