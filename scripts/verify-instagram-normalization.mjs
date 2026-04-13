/**
 * Tiny regression helper for parser URL normalization.
 * This repo does not have a dedicated test runner yet, so keep this focused and easy to run:
 * `npm run verify:instagram-links`
 */
import assert from "node:assert/strict";

import {
  buildInstagramProfileUrl,
  normalizeInstagramUsername,
  parseInstagramUpload,
} from "../lib/instagram-parser.ts";

const usernameCases = [
  ["plain usernames stay unchanged", "Example.User", "example.user"],
  ["leading @ is stripped", "@Example_User", "example_user"],
  ["simple profile paths still work", "/Example.User/", "example.user"],
  [
    "canonical instagram profile URLs resolve correctly",
    "https://www.instagram.com/Example.User/?hl=en",
    "example.user",
  ],
  [
    "instagram _u links skip the prefix segment",
    "https://www.instagram.com/_u/Example_User/",
    "example_user",
  ],
  [
    "accounts/profile links skip the reserved prefix",
    "https://www.instagram.com/accounts/profile/Example.User/",
    "example.user",
  ],
  [
    "non-profile instagram paths are ignored",
    "https://www.instagram.com/p/C7abc123/",
    null,
  ],
];

for (const [label, input, expected] of usernameCases) {
  assert.equal(normalizeInstagramUsername(input), expected, label);
}

assert.equal(
  buildInstagramProfileUrl("https://www.instagram.com/_u/Example_User/"),
  "https://www.instagram.com/example_user/",
  "profile URLs are rebuilt from the normalized username",
);

const followersPayload = JSON.stringify([
  {
    string_list_data: [
      {
        href: "https://www.instagram.com/_u/Example_User/",
        value: "Example_User",
        timestamp: 1710000000,
      },
    ],
  },
]);

const followingPayload = JSON.stringify({
  relationships_following: [
    {
      string_list_data: [
        {
          href: "https://www.instagram.com/accounts/profile/Another.User/",
          value: "Another.User",
          timestamp: 1710000001,
        },
      ],
    },
  ],
});

const parsed = await parseInstagramUpload([
  new File([followersPayload], "followers_1.json", {
    type: "application/json",
  }),
  new File([followingPayload], "following.json", {
    type: "application/json",
  }),
]);

assert.deepEqual(
  parsed.analysis.followers.map((account) => ({
    username: account.username,
    href: account.href,
  })),
  [
    {
      username: "example_user",
      href: "https://www.instagram.com/example_user/",
    },
  ],
  "followers payload keeps normalized usernames and profile links",
);

assert.deepEqual(
  parsed.analysis.following.map((account) => ({
    username: account.username,
    href: account.href,
  })),
  [
    {
      username: "another.user",
      href: "https://www.instagram.com/another.user/",
    },
  ],
  "following payload keeps normalized usernames and profile links",
);

console.log("Instagram username normalization checks passed.");
