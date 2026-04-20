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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(3001, "0.0.0.0", () => console.log("Server running on port 3001"));
