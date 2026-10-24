"use strict";

require("dotenv").config();

const crypto = require("node:crypto");
const http = require("node:http");
const sgMail = require("@sendgrid/mail");

const maximumRequestBytes = 2 * 1024 * 1024;
const maximumRecipients = 5000;
const batchSize = 500;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createEmailNotifier({ sendEmail, token, fromEmail, siteName = "Cyber Junction" }) {
  if (typeof sendEmail !== "function") throw new TypeError("sendEmail must be a function.");
  if (!token || Buffer.byteLength(token) < 32) throw new Error("EMAIL_NOTIFICATION_TOKEN must contain at least 32 bytes.");
  if (!emailPattern.test(fromEmail || "")) throw new Error("SENDGRID_FROM_EMAIL must be a valid email address.");

  async function readJson(request) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > maximumRequestBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        throw error;
      }
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  return http.createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");

    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200).end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.method !== "POST" || request.url !== "/internal/article-published") {
      response.writeHead(404).end(JSON.stringify({ error: "Route not found." }));
      return;
    }

    const authorization = Buffer.from(request.headers.authorization || "");
    const expectedAuthorization = Buffer.from(`Bearer ${token}`);
    if (authorization.length !== expectedAuthorization.length
      || !crypto.timingSafeEqual(authorization, expectedAuthorization)) {
      response.writeHead(401).end(JSON.stringify({ error: "Authentication required." }));
      return;
    }

    try {
      const payload = await readJson(request);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        response.writeHead(422).end(JSON.stringify({ error: "A notification payload is required." }));
        return;
      }
      const article = payload.article;
      const title = typeof article?.title === "string" ? article.title.trim() : "";
      const description = typeof article?.description === "string" ? article.description.trim() : "";
      const category = typeof article?.category === "string" ? article.category.trim() : "";
      let articleUrl = null;
      try {
        if (typeof article?.url === "string") articleUrl = new URL(article.url);
      } catch {
        articleUrl = null;
      }
      if (!title || title.length > 300 || !articleUrl || !["http:", "https:"].includes(articleUrl.protocol)) {
        response.writeHead(422).end(JSON.stringify({ error: "A valid published article is required." }));
        return;
      }

      if (!Array.isArray(payload.recipients) || payload.recipients.length > maximumRecipients) {
        response.writeHead(422).end(JSON.stringify({ error: `Provide no more than ${maximumRecipients} subscribers.` }));
        return;
      }
      const recipients = payload.recipients.map((email) => (
        typeof email === "string" ? email.trim().toLowerCase() : ""
      ));
      if (recipients.some((email) => email.length > 254 || !emailPattern.test(email))) {
        response.writeHead(422).end(JSON.stringify({ error: "Every subscriber must have a valid email address." }));
        return;
      }
      const uniqueRecipients = [...new Set(recipients)];
      if (!uniqueRecipients.length) {
        response.writeHead(200).end(JSON.stringify({ sentCount: 0 }));
        return;
      }

      const safeTitle = escapeHtml(title);
      const safeDescription = escapeHtml(description);
      const safeCategory = escapeHtml(category);
      const safeName = escapeHtml(siteName);
      const safeUrl = escapeHtml(articleUrl.href);
      const message = {
        from: fromEmail,
        subject: `New on ${siteName}: ${title.replace(/[\r\n]+/g, " ").slice(0, 250)}`,
        text: [
          `A new article has been published on ${siteName}.`,
          "",
          title,
          category ? `Category: ${category}` : "",
          description,
          "",
          articleUrl.href
        ].filter(Boolean).join("\n"),
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#173650"><p>A new article has been published on ${safeName}.</p><p>${safeCategory ? `<strong>${safeCategory}</strong><br>` : ""}<strong>${safeTitle}</strong></p>${safeDescription ? `<p>${safeDescription}</p>` : ""}<p><a href="${safeUrl}">Read the article</a></p></div>`
      };

      for (let offset = 0; offset < uniqueRecipients.length; offset += batchSize) {
        const personalizations = uniqueRecipients.slice(offset, offset + batchSize)
          .map((email) => ({ to: [{ email }] }));
        await sendEmail({ ...message, personalizations });
      }

      response.writeHead(202).end(JSON.stringify({ sentCount: uniqueRecipients.length }));
    } catch (error) {
      const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      response.writeHead(status).end(JSON.stringify({
        error: status === 413
          ? "Request body is too large."
          : status === 400
            ? "Invalid JSON request."
            : "Email notification delivery failed."
      }));
      if (status === 500) console.error("Article notification delivery failed:", error.message);
    }
  });
}

if (require.main === module) {
  const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, EMAIL_NOTIFICATION_TOKEN } = process.env;
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || !EMAIL_NOTIFICATION_TOKEN) {
    throw new Error("Set SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, and EMAIL_NOTIFICATION_TOKEN.");
  }

  sgMail.setApiKey(SENDGRID_API_KEY);
  const server = createEmailNotifier({
    sendEmail: (message) => sgMail.send(message),
    token: EMAIL_NOTIFICATION_TOKEN,
    fromEmail: SENDGRID_FROM_EMAIL,
    siteName: process.env.SITE_NAME || "Cyber Junction"
  });
  const port = Number.parseInt(process.env.PORT || "4000", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Email notifier listening on port ${port}.`);
  });
}

module.exports = { createEmailNotifier };
