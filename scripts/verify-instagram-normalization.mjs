/**
 * Tiny regression helper for parser URL normalization.
 * This repo does not have a dedicated test runner yet, so keep this focused and easy to run:
 * `npm run verify:instagram-links`
 */
import assert from "node:assert/strict";

import {
  buildInstagramProfileUrl,
  normalizeInstagramUsername,
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

console.log("Instagram username normalization checks passed.");
