import {
  analyzeRelationships,
  type FollowAccount,
  type ParseResult,
} from "@/lib/instagram-parser";

function buildAccount(username: string, sourcePath: string): FollowAccount {
  return {
    username,
    href: `https://www.instagram.com/${username}/`,
    timestamp: null,
    sourcePath,
  };
}

export function createSampleAnalysis(): ParseResult {
  const following = [
    "atlas.note",
    "bora.studio",
    "cam_park",
    "dailybrunch",
    "film.noon",
    "hanriver.lab",
    "june.dev",
    "mintcat",
    "naru_trip",
    "slowform",
  ].map((username) => buildAccount(username, "sample/following.json"));

  const followers = [
    "atlas.note",
    "cam_park",
    "doyun.log",
    "film.noon",
    "june.dev",
    "mintcat",
    "oldtown.map",
    "polo.dev",
    "slowform",
  ].map((username) => buildAccount(username, "sample/followers_1.json"));

  return {
    analysis: analyzeRelationships(followers, following),
    warnings: [
      "샘플 데이터는 UI 검증용 예시입니다. 실제 Instagram export와 계정 수가 다를 수 있습니다.",
    ],
    parsedSources: ["sample/followers_1.json", "sample/following.json"],
  };
}
