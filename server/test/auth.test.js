"use strict";

/**
 * Real validation for server/src/middleware/auth.ts (compiled to
 * dist/middleware/auth.js).
 *
 * The middleware reads config.clientToken at import time, so each scenario runs in a
 * child process with a controlled environment. req/res are minimal mocks; outcomes are
 * reported back to the parent as JSON.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const serverRoot = path.join(__dirname, "..");
const authPath = path.join(serverRoot, "dist", "middleware", "auth.js");

function runMiddlewareScenarios(env) {
  const script = `
    const { requireClientToken } = require(${JSON.stringify(authPath)});

    function run(header) {
      const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
      };
      let nextCalled = false;
      requireClientToken(
        { header: () => header },
        res,
        () => { nextCalled = true; }
      );
      return { nextCalled, statusCode: res.statusCode, body: res.body };
    }

    const token = process.env.MACSENSE_CLIENT_TOKEN || null;
    process.stdout.write(JSON.stringify({
      noHeader: run(undefined),
      wrongToken: run("Bearer definitely-wrong"),
      correctToken: run(token ? "Bearer " + token : undefined),
    }));
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: serverRoot,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `middleware scenario crashed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

test("auth: no MACSENSE_CLIENT_TOKEN configured -> gate is a pass-through", () => {
  const outcome = runMiddlewareScenarios({ GEMINI_API_KEY: "test-key" });
  assert.equal(outcome.noHeader.nextCalled, true);
  assert.equal(outcome.wrongToken.nextCalled, true);
  assert.equal(outcome.noHeader.statusCode, null);
  assert.equal(outcome.wrongToken.statusCode, null);
});

test("auth: token configured -> missing or wrong bearer gets 401 unauthorized", () => {
  const outcome = runMiddlewareScenarios({
    GEMINI_API_KEY: "test-key",
    MACSENSE_CLIENT_TOKEN: "s3cret",
  });
  for (const scenario of ["noHeader", "wrongToken"]) {
    assert.equal(outcome[scenario].nextCalled, false, `${scenario} must not call next()`);
    assert.equal(outcome[scenario].statusCode, 401);
    assert.deepEqual(outcome[scenario].body, { error: "Unauthorized", code: "unauthorized" });
  }
});

test("auth: token configured -> correct bearer passes through", () => {
  const outcome = runMiddlewareScenarios({
    GEMINI_API_KEY: "test-key",
    MACSENSE_CLIENT_TOKEN: "s3cret",
  });
  assert.equal(outcome.correctToken.nextCalled, true);
  assert.equal(outcome.correctToken.statusCode, null);
});
