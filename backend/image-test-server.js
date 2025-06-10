const express = require("express");
const path = require("path");
const fs = require('fs');
const mime = require('mime-types');
const app = express();

// Test all image serving methods
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath, stat) => {
        const mimeType = mime.lookup(filePath);
        if (mimeType) {
            res.setHeader('Content-Type', mimeType);
        }
    }
}));

app.get('/*.jpeg', (req, res) => {
    const filename = path.basename(req.url);
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Image not found' });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Served-By', 'direct-route');
    res.sendFile(filePath);
});

app.get('/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const stat = fs.statSync(filePath);
    
    res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache',
        'X-Served-By': 'stream-method'
    });
    
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
});

app.get('/', (req, res) => {
    res.send(`
        <h1>Image Test Server</h1>
        <h2>Test URLs:</h2>
        <ul>
            <li><a href="/uploads/DefaultAvatar.jpeg">Static Route: /uploads/DefaultAvatar.jpeg</a></li>
            <li><a href="/DefaultAvatar.jpeg">Direct Route: /DefaultAvatar.jpeg</a></li>
            <li><a href="/stream/DefaultAvatar.jpeg">Stream Route: /stream/DefaultAvatar.jpeg</a></li>
        </ul>
        <h2>Images:</h2>
        <img src="/uploads/DefaultAvatar.jpeg" alt="Static" style="max-width:100px;margin:10px;" />
        <img src="/DefaultAvatar.jpeg" alt="Direct" style="max-width:100px;margin:10px;" />
        <img src="/stream/DefaultAvatar.jpeg" alt="Stream" style="max-width:100px;margin:10px;" />
    `);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Image test server running on http://localhost:${PORT}`);
});
