# FollowScope

FollowScope is a privacy-first MVP for analyzing Instagram export data entirely in the browser. Users can upload an Instagram export ZIP or follower/following JSON files and immediately inspect:

- accounts I follow but who do not follow me back
- followers I do not follow back
- mutual follow count
- searchable result lists per relationship tab

This project is intentionally original in branding and does not reuse Toollyst branding or assets.

## Project Overview

FollowScope is designed to be deployment-friendly and low-risk:

- no authentication
- no database
- no upload API
- no required environment variables
- no server-side persistence of user exports

The current app is a client-side parser and viewer with a Korean product surface, sample mode, and a privacy-forward onboarding flow.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- `fflate` for client-side ZIP parsing

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Privacy Model

- Analysis happens client-side in the browser session.
- Uploaded files are parsed in memory for the current session only.
- No database, upload API, or permanent storage is included in this MVP.
- The intended product positioning is privacy-first, not account-linked or cloud-synced.

## User Flow

### 1. Instagram export file 받기

The in-product guide and this README follow the current Meta Accounts Center export flow:

1. Instagram 앱 또는 웹에서 설정을 연 뒤 `Accounts Center`로 이동합니다.
2. `내 정보 및 권한(Your information and permissions)`에서 `내 정보 내보내기(Export your information)`를 선택합니다.
3. `Create export`를 눌러 분석할 Instagram 프로필을 고른 뒤 `Export to device`를 선택합니다.
4. 형식은 반드시 `JSON`으로 선택합니다.
5. 준비 완료 알림을 받은 뒤 ZIP 파일을 내려받습니다.

권장 경로:

- 가장 쉬운 방법은 원본 ZIP 그대로 업로드하는 것입니다.
- 용량을 줄이려고 일부 JSON만 사용할 경우 follower/following 관계 정보가 포함되어야 합니다.
- JSON 파일만 직접 업로드할 때는 `followers_*.json`과 `following*.json`을 함께 넣어야 합니다.

### 2. FollowScope에서 분석하기

1. 앱 첫 화면에서 ZIP 또는 JSON 파일을 드래그 앤 드롭하거나 `파일 선택하기`를 누릅니다.
2. ZIP을 사용한다면 압축을 풀지 않고 그대로 업로드합니다.
3. 분석이 끝나면 요약 카드에서 맞팔 수, 나만 팔로우 중인 수, 되팔로우하지 않은 팔로워 수를 확인합니다.
4. 탭과 검색창으로 계정 목록을 빠르게 정리합니다.

### 3. 샘플 모드 사용하기

실제 Instagram export가 없어도 `샘플 데이터로 체험` 버튼으로 전체 UI 흐름을 바로 확인할 수 있습니다. 샘플 모드는 실제 파서 흐름을 건드리지 않고 화면 검증용 결과만 주입합니다.

## Supported Input Shapes

The parser is designed for the most common Instagram export structures seen in follower/following data:

- `followers_1.json`, `followers_2.json`, ...
- `following.json` or `following_1.json`, `following_2.json`, ...
- ZIP archives containing those files in nested folders such as `connections/followers_and_following/...`

The parser looks for the common `string_list_data` shape used in Instagram exports and extracts usernames from `value`, `href`, or `title` when available.

## Deployment Notes

This project is suitable for a simple frontend deployment:

- deploy to Vercel or any Node-compatible Next.js host
- no backend service setup is required for the current MVP
- no secrets or runtime env vars are required for the current feature set
- privacy posture depends on keeping parsing client-side and avoiding new upload/storage features without a product decision

## MVP Scope

Included:

- Korean landing page and in-product usage guide
- drag-and-drop and file picker upload flow
- client-side parsing for ZIP or JSON upload
- summary cards and tabbed result sections
- per-tab search/filter
- sample mode for UI validation
- empty, loading, warning, and error states

Not included:

- authentication
- server-side storage
- historical comparisons
- CSV export
- advanced analytics beyond follower/following overlap

## Assumptions and Limitations

- This MVP prioritizes the most common export filenames and structures, not every Instagram export variant ever shipped.
- If the ZIP contains unrelated JSON files, the app ignores most of them and focuses on follower/following candidates.
- If either followers or following data cannot be found, the app shows a clear error instead of guessing.
- No automated test suite is configured yet beyond lint, typecheck, and production build verification.
