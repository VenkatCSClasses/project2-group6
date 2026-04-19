const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const FILE = "./accounts.json";

// Register user
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));

  if (data.users.some(u => u.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = {
    username,
    password,
    documents: {
      writer: [],
      editor: []
    }
  };

  data.users.push(newUser);

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({ message: "User registered" });
});

// Login user
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));

  const user = data.users.find(u => u.username === username);

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  if (user.password !== password) {
    return res.status(400).json({ error: "Incorrect password" });
  }

  res.json({ message: "Login successful" });
});

app.listen(3001, () => console.log("Server running on port 3001"));