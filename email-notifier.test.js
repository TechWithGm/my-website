"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createEmailNotifier } = require("./email-notifier");

const token = "a-test-token-that-is-long-enough-for-unit-tests";
let server;
let baseUrl;
const sentMessages = [];

before(async () => {
  server = createEmailNotifier({
    sendEmail: async (message) => sentMessages.push(message),
    token,
    fromEmail: "verified@example.com"
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("requires the internal notification token", async () => {
  const response = await fetch(`${baseUrl}/internal/article-published`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("sends new article mail with one private personalization per subscriber", async () => {
  const response = await fetch(`${baseUrl}/internal/article-published`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      article: {
        title: "New article",
        category: "Results",
        description: "A useful update",
        url: "https://example.com/new-article/"
      },
      recipients: ["reader@example.com", "second@example.com"]
    })
  });

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { sentCount: 2 });
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(
    sentMessages[0].personalizations.map((item) => item.to[0].email),
    ["reader@example.com", "second@example.com"]
  );
  assert.match(sentMessages[0].html, /New article/);
});

test("rejects non-HTTP article links", async () => {
  const response = await fetch(`${baseUrl}/internal/article-published`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      article: { title: "Bad link", url: "javascript:alert(1)" },
      recipients: ["reader@example.com"]
    })
  });
  assert.equal(response.status, 422);
});

test("splits large subscriber lists into SendGrid-safe batches", async () => {
  const recipients = Array.from({ length: 501 }, (_, index) => `reader${index}@example.com`);
  const response = await fetch(`${baseUrl}/internal/article-published`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      article: {
        title: "<Update>",
        category: "Results",
        description: "<New notice>",
        url: "https://example.com/new-article/"
      },
      recipients
    })
  });

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { sentCount: 501 });
  assert.deepEqual(
    sentMessages.slice(1).map((message) => message.personalizations.length),
    [500, 1]
  );
  assert.match(sentMessages[1].html, /&lt;Update&gt;/);
  assert.match(sentMessages[1].html, /&lt;New notice&gt;/);
});
