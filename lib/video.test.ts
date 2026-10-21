import { test } from "node:test";
import assert from "node:assert/strict";
import { lienIntegrable } from "./video.ts";

test("YouTube : liens courts, classiques et shorts", () => {
  assert.equal(lienIntegrable("https://youtu.be/abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(lienIntegrable("https://www.youtube.com/watch?v=abc123&t=4"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(lienIntegrable("https://youtube.com/shorts/xyz"), "https://www.youtube-nocookie.com/embed/xyz");
});

test("site inconnu ou lien invalide : pas d'intégration", () => {
  assert.equal(lienIntegrable("https://exemple.ci/video.mp4"), null);
  assert.equal(lienIntegrable("pas une url"), null);
});
