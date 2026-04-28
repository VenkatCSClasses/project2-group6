const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());

const documentsRouter = require("./documents");
app.use("/api", documentsRouter);

const FILE = path.join(__dirname, "accounts.json");

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));

  if (data.users.some((entry) => entry.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }

  data.users.push({
    username,
    password,
    documents: { writer: [], editor: [] },
  });

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  res.json({ message: "User registered" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const user = data.users.find((entry) => entry.username === username);

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  if (user.password !== password) {
    return res.status(400).json({ error: "Incorrect password" });
  }

  res.json({ message: "Login successful" });
});

function normalizeSiteUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");

  if (!trimmed) {
    return "";
  }

  try {
    const normalized = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);

    if (normalized.protocol === "http:" && normalized.hostname !== "localhost" && normalized.hostname !== "127.0.0.1") {
      normalized.protocol = "https:";
    }

    normalized.pathname = normalized.pathname === "/" ? "" : normalized.pathname.replace(/\/$/, "");
    normalized.search = "";
    normalized.hash = "";

    return `${normalized.origin}${normalized.pathname}`;
  } catch {
    return trimmed;
  }
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

app.post("/api/wordpress/publish", async (req, res) => {
  const { siteUrl, username, appPassword, title, content, status } = req.body || {};
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const activeUsername = String(username || "").trim();
  const activeAppPassword = String(appPassword || "").replace(/\s+/g, "");
  const postTitle = String(title || "").trim();
  const postContent = String(content || "").trim();

  if (!normalizedSiteUrl || !activeUsername || !activeAppPassword || !postTitle || !postContent) {
    return res.status(400).json({ error: "Missing WordPress publish fields." });
  }

  const endpoint = `${normalizedSiteUrl}/wp-json/wp/v2/posts`;
  const credentials = Buffer.from(`${activeUsername}:${activeAppPassword}`).toString("base64");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        title: postTitle,
        content: postContent,
        status,
      }),
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      const message =
        response.status === 401
          ? "WordPress rejected the credentials. Use a WordPress Application Password, not your normal admin login password, and verify the canonical site URL."
          :
        body && typeof body === "object" && "message" in body && typeof body.message === "string"
          ? body.message
          : response.statusText || "Failed to publish to WordPress.";

      return res.status(response.status).json({
        error: message,
        details: body,
      });
    }

    return res.json(body);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Unexpected error while publishing to WordPress.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(3001, "0.0.0.0", () => console.log("Server running on port 3001"));
