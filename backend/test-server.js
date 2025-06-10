const express = require("express");
const path = require("path");
const fs = require('fs');
const app = express();

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route for direct image access
app.get('/*.jpeg', (req, res) => {
    const filename = path.basename(req.url);
    const filePath = path.join(__dirname, 'uploads', filename);
    
    console.log(`Requesting: ${filename}`);
    console.log(`File path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Image not found' });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(filePath);
});

app.get('/', (req, res) => {
    res.send('Test server running!');
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log(`Test image: http://localhost:${PORT}/DefaultAvatar.jpeg`);
});
