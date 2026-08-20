import test from "node:test";
import assert from "node:assert/strict";

import handler from "../api/discord.js";

test("GET request returns a successful health response", async () => {
  const request = new Request("https://example.com/api/discord", {
    method: "GET"
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK");
});

test("POST without Discord public key fails clearly", async () => {
  delete process.env.DISCORD_PUBLIC_KEY;

  const request = new Request("https://example.com/api/discord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature-ed25519": "abc",
      "x-signature-timestamp": "123"
    },
    body: JSON.stringify({ type: 1 })
  });

  const response = await handler(request);

  assert.equal(response.status, 500);
  assert.match(await response.text(), /Discord public key is not configured/i);
});
