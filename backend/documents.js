const express = require("express");
const fs = require("fs");

const router = express.Router();

const FILE = "./accounts.json";

// Get all documents
router.get("/documents", (req, res) => {
    const { username } = req.query;

    const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));

    const user = data.users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json({
        writerDocs: user.documents.writer,
        editorDocs: user.documents.editor
    });
});

module.exports = router;