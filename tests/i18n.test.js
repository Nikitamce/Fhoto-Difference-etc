import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translations } from "../src/i18n.js";

test("Russian and English dictionaries expose the same translation keys", () => {
  assert.deepEqual(
    Object.keys(translations.ru).sort(),
    Object.keys(translations.en).sort()
  );
});

test("all UI and runtime translation references exist in both dictionaries", async () => {
  const files = ["index.html", "src/app.js", "src/studio.js"];
  const sources = await Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url), "utf8")));
  const references = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(/data-i18n(?:-title|-aria-label)?=\"([A-Za-z0-9_]+)\"/g)) references.add(match[1]);
    for (const match of source.matchAll(/i18n\.t\([\"']([A-Za-z0-9_]+)[\"']/g)) references.add(match[1]);
  }
  for (const key of references) {
    assert.ok(Object.hasOwn(translations.ru, key), `Missing RU key: ${key}`);
    assert.ok(Object.hasOwn(translations.en, key), `Missing EN key: ${key}`);
  }
});
