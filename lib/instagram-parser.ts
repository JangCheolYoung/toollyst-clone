import { strFromU8, unzipSync } from "fflate";

export type FollowAccount = {
  username: string;
  href: string | null;
  timestamp: number | null;
  sourcePath: string;
};

export type AnalysisCounts = {
  followers: number;
  following: number;
  mutuals: number;
  followingOnly: number;
  followersOnly: number;
  comparedTotal: number;
};

export type RelationshipAnalysis = {
  followers: FollowAccount[];
  following: FollowAccount[];
  mutuals: FollowAccount[];
  followingOnly: FollowAccount[];
  followersOnly: FollowAccount[];
  counts: AnalysisCounts;
};

export type ParseResult = {
  analysis: RelationshipAnalysis;
  warnings: string[];
  parsedSources: string[];
};

type RelationshipKind = "followers" | "following";

const FOLLOWERS_FILE_RE = /(^|\/)followers(_\d+)?\.json$/i;
const FOLLOWING_FILE_RE = /(^|\/)following(_\d+)?\.json$/i;

function normalizePath(path: string) {
  return path.replaceAll("\\", "/").trim();
}

function classifyPath(path: string): RelationshipKind | null {
  const normalized = normalizePath(path).toLowerCase();

  if (FOLLOWERS_FILE_RE.test(normalized)) {
    return "followers";
  }

  if (FOLLOWING_FILE_RE.test(normalized)) {
    return "following";
  }

  return null;
}

function normalizeUsername(candidate: unknown): string | null {
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (withoutAt.includes("instagram.com")) {
    try {
      const url = new URL(withoutAt.startsWith("http") ? withoutAt : `https://${withoutAt}`);
      const [segment] = url.pathname.split("/").filter(Boolean);

      if (segment) {
        return segment.toLowerCase();
      }
    } catch {
      return null;
    }
  }

  return withoutAt.replace(/^\/+|\/+$/g, "").toLowerCase();
}

function dedupeAccounts(accounts: FollowAccount[]) {
  const byUsername = new Map<string, FollowAccount>();

  for (const account of accounts) {
    if (!byUsername.has(account.username)) {
      byUsername.set(account.username, account);
    }
  }

  return [...byUsername.values()].sort((left, right) =>
    left.username.localeCompare(right.username),
  );
}

function extractAccountsFromPayload(payload: unknown, sourcePath: string) {
  const accounts: FollowAccount[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }

      return;
    }

    const record = node as Record<string, unknown>;
    const stringListData = Array.isArray(record.string_list_data)
      ? record.string_list_data
      : null;

    if (stringListData && stringListData.length > 0) {
      for (const item of stringListData) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const listEntry = item as Record<string, unknown>;
        const username =
          normalizeUsername(listEntry.value) ??
          normalizeUsername(listEntry.href) ??
          normalizeUsername(record.title);

        if (!username) {
          continue;
        }

        accounts.push({
          username,
          href: typeof listEntry.href === "string" ? listEntry.href : null,
          timestamp:
            typeof listEntry.timestamp === "number" ? listEntry.timestamp : null,
          sourcePath,
        });
      }

      return;
    }

    for (const value of Object.values(record)) {
      visit(value);
    }
  };

  visit(payload);

  return dedupeAccounts(accounts);
}

function detectKindFromPayload(path: string, payload: unknown): RelationshipKind | null {
  const pathGuess = classifyPath(path);

  if (pathGuess) {
    return pathGuess;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if ("relationships_following" in record) {
    return "following";
  }

  if ("followers" in record || "relationships_followers" in record) {
    return "followers";
  }

  return null;
}

function parseJsonSource(
  text: string,
  sourcePath: string,
  hintedKind: RelationshipKind | null,
) {
  let payload: unknown;

  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    return {
      kind: null,
      accounts: [],
      warning: `${sourcePath} 파일은 JSON 파싱에 실패해 건너뛰었습니다.`,
    };
  }

  const kind = hintedKind ?? detectKindFromPayload(sourcePath, payload);

  if (!kind) {
    return {
      kind: null,
      accounts: [],
      warning: `${sourcePath} 파일은 followers/following 데이터로 분류하지 못해 건너뛰었습니다.`,
    };
  }

  const accounts = extractAccountsFromPayload(payload, sourcePath);

  if (accounts.length === 0) {
    return {
      kind,
      accounts,
      warning: `${sourcePath} 파일에서 계정을 찾지 못했습니다. Instagram JSON 구조가 예상과 다를 수 있습니다.`,
    };
  }

  return {
    kind,
    accounts,
    warning: null,
  };
}

export async function parseInstagramUpload(files: File[]): Promise<ParseResult> {
  const followers: FollowAccount[] = [];
  const following: FollowAccount[] = [];
  const warnings = new Set<string>();
  const parsedSources = new Set<string>();

  for (const file of files) {
    const filename = normalizePath(file.name);

    if (filename.toLowerCase().endsWith(".zip")) {
      let archive: Record<string, Uint8Array>;

      try {
        archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
      } catch {
        throw new Error(
          `${filename} ZIP을 열지 못했습니다. Instagram export 원본 ZIP인지 다시 확인해 주세요.`,
        );
      }

      for (const [entryPath, bytes] of Object.entries(archive)) {
        const normalizedEntryPath = entryPath.toLowerCase();

        if (
          !normalizedEntryPath.endsWith(".json") ||
          !normalizedEntryPath.includes("follow")
        ) {
          continue;
        }

        const result = parseJsonSource(
          strFromU8(bytes),
          entryPath,
          classifyPath(entryPath),
        );

        if (result.warning) {
          warnings.add(result.warning);
        }

        if (result.kind === "followers") {
          followers.push(...result.accounts);
          parsedSources.add(entryPath);
        }

        if (result.kind === "following") {
          following.push(...result.accounts);
          parsedSources.add(entryPath);
        }
      }

      continue;
    }

    if (!filename.toLowerCase().endsWith(".json")) {
      warnings.add(`${filename} 파일은 JSON 또는 ZIP이 아니라서 건너뛰었습니다.`);
      continue;
    }

    const result = parseJsonSource(
      await file.text(),
      filename,
      classifyPath(filename),
    );

    if (result.warning) {
      warnings.add(result.warning);
    }

    if (result.kind === "followers") {
      followers.push(...result.accounts);
      parsedSources.add(filename);
    }

    if (result.kind === "following") {
      following.push(...result.accounts);
      parsedSources.add(filename);
    }
  }

  const dedupedFollowers = dedupeAccounts(followers);
  const dedupedFollowing = dedupeAccounts(following);

  if (dedupedFollowers.length === 0 || dedupedFollowing.length === 0) {
    throw new Error(
      "followers와 following 데이터를 모두 찾지 못했습니다. Instagram export ZIP 또는 followers/following JSON 파일을 함께 업로드해 주세요.",
    );
  }

  return {
    analysis: analyzeRelationships(dedupedFollowers, dedupedFollowing),
    warnings: [...warnings],
    parsedSources: [...parsedSources],
  };
}

export function analyzeRelationships(
  followers: FollowAccount[],
  following: FollowAccount[],
): RelationshipAnalysis {
  const followerMap = new Map(followers.map((account) => [account.username, account]));
  const followingMap = new Map(following.map((account) => [account.username, account]));

  const mutuals = [...followingMap.values()].filter((account) =>
    followerMap.has(account.username),
  );
  const followingOnly = [...followingMap.values()].filter(
    (account) => !followerMap.has(account.username),
  );
  const followersOnly = [...followerMap.values()].filter(
    (account) => !followingMap.has(account.username),
  );
  const comparedTotal = new Set([
    ...followerMap.keys(),
    ...followingMap.keys(),
  ]).size;

  return {
    followers: [...followerMap.values()],
    following: [...followingMap.values()],
    mutuals: dedupeAccounts(mutuals),
    followingOnly: dedupeAccounts(followingOnly),
    followersOnly: dedupeAccounts(followersOnly),
    counts: {
      followers: followerMap.size,
      following: followingMap.size,
      mutuals: mutuals.length,
      followingOnly: followingOnly.length,
      followersOnly: followersOnly.length,
      comparedTotal,
    },
  };
}
