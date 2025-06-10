const express = require("express");
const path = require("path");
const fs = require('fs');
const mime = require('mime-types');
const cors = require("cors");

const app = express();

// Enable CORS
app.use(cors({
    origin: "https://shopingse.id.vn",
    credentials: true,
}));

// Debug middleware to log ALL requests
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log(`[DEBUG] User-Agent: ${req.get('User-Agent')}`);
    console.log(`[DEBUG] Accept: ${req.get('Accept')}`);
    next();
});

// PRIORITY ROUTE: Handle DefaultAvatar.jpeg specifically
app.get('/DefaultAvatar.jpeg', (req, res) => {
    console.log(`[DEFAULT AVATAR] Request received for DefaultAvatar.jpeg`);
    
    const filePath = path.join(__dirname, 'uploads', 'DefaultAvatar.jpeg');
    console.log(`[DEFAULT AVATAR] Looking for file at: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`[DEFAULT AVATAR] File not found!`);
        return res.status(404).json({ error: 'DefaultAvatar.jpeg not found' });
    }
    
    const stats = fs.statSync(filePath);
    console.log(`[DEFAULT AVATAR] File found, size: ${stats.size} bytes`);
    
    // Set explicit headers
    res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Served-By': 'clean-server',
        'X-File-Path': filePath,
        'X-Debug-Mode': 'true'
    });
    
    // Stream the file
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
    readStream.on('end', () => {
        console.log(`[DEFAULT AVATAR] File served successfully`);
    });
    
    readStream.on('error', (err) => {
        console.error(`[DEFAULT AVATAR] Error streaming file:`, err);
    });
});

// Generic image route for other images
app.get('/*.jpeg', (req, res) => {
    const filename = path.basename(req.path);
    console.log(`[IMAGE] Request for: ${filename}`);
    
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`[IMAGE] File not found: ${filename}`);
        return res.status(404).json({ error: `Image ${filename} not found` });
    }
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Served-By', 'generic-image-route');
    
    res.sendFile(filePath);
});

// Test route to verify server is working
app.get('/health', (req, res) => {
    console.log(`[HEALTH] Health check requested`);
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        server: 'clean-image-server'
    });
});

// Root route
app.get('/', (req, res) => {
    console.log(`[ROOT] Root route accessed`);
    res.json({
        message: 'Clean Image Server Running',
        availableRoutes: [
            '/DefaultAvatar.jpeg',
            '/health',
            '/*.jpeg'
        ]
    });
});

// Catch all unhandled routes
app.use('*', (req, res) => {
    console.log(`[UNHANDLED] Unhandled route: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`Clean Image Server running on port ${PORT}`);
    console.log(`Test URLs:`);
    console.log(`- http://localhost:${PORT}/health`);
    console.log(`- http://localhost:${PORT}/DefaultAvatar.jpeg`);
    console.log(`=================================\n`);
});
