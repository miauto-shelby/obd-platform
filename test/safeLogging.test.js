const test = require("node:test");
const assert = require("node:assert/strict");

const {
  redactSensitiveText,
  safeErrorSummary,
} = require("../src/utils/safeLogging");

test("redacts credentials and tokens from operational messages", () => {
  const message = [
    "Could not connect to mongodb+srv://my-user:my-password@cluster.example.net/my_auto",
    "accessToken=eyJhbGciOiJIUzI1NiJ9.payload.signature",
    "refreshToken=private-value",
  ].join("; ");

  const result = redactSensitiveText(message);

  assert.doesNotMatch(result, /my-user:my-password/);
  assert.doesNotMatch(result, /eyJhbGciOiJIUzI1NiJ9\.payload\.signature/);
  assert.doesNotMatch(result, /private-value/);
  assert.match(result, /\[redacted\]/);
});

test("summarizes an error without exposing its MongoDB password", () => {
  const result = safeErrorSummary(
    new Error("Connection failed: mongodb://admin:secret-password@localhost:27017")
  );

  assert.doesNotMatch(result, /secret-password/);
  assert.match(result, /mongodb:\/\/\[redacted\]@localhost/);
});
