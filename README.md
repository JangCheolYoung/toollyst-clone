# FollowScope

FollowScope is a privacy-forward MVP for analyzing Instagram export data in the browser. Users can upload an Instagram export ZIP or follower/following JSON files and immediately inspect:

- accounts I follow but who do not follow me back
- followers I do not follow back
- mutual follow count
- simple search/filter over each result list

This project is intentionally original in branding and does not reuse Toollyst branding or assets.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- `fflate` for client-side ZIP parsing

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Privacy Model

- Analysis happens client-side in the browser session.
- No database, upload API, or permanent storage is included in this MVP.
- Uploaded files are parsed in memory for the current session only.

## How Instagram Export Works

1. In Instagram, request your data export and choose `JSON` when possible.
2. After the export is ready, download the ZIP.
3. In FollowScope, either:
   - upload the ZIP directly, or
   - upload the follower/following JSON files together

The easiest path is uploading the original export ZIP.

## Supported Input Shapes

The parser is designed for the most common Instagram export structures seen in follower/following data:

- `followers_1.json`, `followers_2.json`, ...
- `following.json` or `following_1.json`, `following_2.json`, ...
- ZIP archives containing those files in nested folders such as `connections/followers_and_following/...`

The parser looks for the common `string_list_data` shape used in Instagram exports and extracts usernames from `value`, `href`, or `title` when available.

## Sample Mode

The app includes a small built-in sample dataset so the UI can be tested without a real Instagram export. Use the `샘플 데이터로 체험` button on the landing page.

## MVP Scope

Included:

- Korean landing page
- upload area with drag-and-drop and file picker
- client-side parsing for ZIP or JSON upload
- summary cards
- tabbed result sections
- search/filter within the current tab
- empty, loading, warning, and error states

Not included:

- authentication
- server-side storage
- historical comparisons
- CSV export
- advanced analytics beyond follower/following overlap

## Verification

Validated locally with:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Assumptions and Limitations

- This MVP prioritizes the most common export filenames and structures, not every Instagram export variant ever shipped.
- If the ZIP contains unrelated JSON files, the app ignores most of them and focuses on follower/following candidates.
- If either followers or following data cannot be found, the app shows a clear error instead of guessing.
- No automated test suite is configured yet beyond lint, typecheck, and production build verification.
