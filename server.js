const express = require("express");
const path = require("path");
const app = express();

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname + "/admin.html"));
});

app.get("/admin/nft", (req, res) => {
    res.sendFile(path.join(__dirname + "/adminNFT.html"));
});

app.get("/nft", (req, res) => {
    res.sendFile(path.join(__dirname + "/userNFT.html"));
});

const PORT = 3000; // Change the port number here
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
