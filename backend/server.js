const express = require("express");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();

const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const mime = require('mime-types');
const fs = require('fs');
require('dotenv').config();

// Import OQS Signature utility
const { initOQSSignature } = require('./utils/oqsSignature');

// Load environment variables from .env file
// This should be done only once at the very beginning
if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({
        path: "config/.env",
    });
}

// Connect to the database
connectDatabase();

// Middlewares
app.use(express.json()); // Parses incoming JSON requests
app.use(cookieParser()); // Parses cookies attached to the client request object

app.use(
  cors({
    origin: "https://shopingse.id.vn",
    credentials: true,
  })
);

// URGENT: Move image routes BEFORE all other routes to prevent React app fallback
// This must be the FIRST middleware after CORS
console.log('Setting up URGENT image routes...');

// Most important - move this to the very top after CORS
app.get('/DefaultAvatar.jpeg', (req, res) => {
    console.log(`[URGENT ROUTE] Direct access to DefaultAvatar.jpeg`);
    const filePath = path.join(__dirname, 'uploads', 'DefaultAvatar.jpeg');
    
    if (!fs.existsSync(filePath)) {
        console.log(`[URGENT ROUTE] File not found at: ${filePath}`);
        return res.status(404).json({ message: 'DefaultAvatar not found' });
    }
    
    console.log(`[URGENT ROUTE] Serving DefaultAvatar.jpeg`);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache'); 
    res.setHeader('Expires', '0');
    res.setHeader('X-Served-By', 'urgent-route');
    res.setHeader('X-Debug', 'bypass-everything');
    
    return res.sendFile(filePath);
});

// Serve static files from the 'uploads' directory with proper MIME types
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath, stat) => {
        const mimeType = mime.lookup(filePath);
        if (mimeType) {
            res.setHeader('Content-Type', mimeType);
        }
        // Add cache headers for better performance
        if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache images for 1 year
        }
    }
}));

// Enhanced static file serving middleware for root level files
app.use((req, res, next) => {
    // Check if the request is for an image file at root level
    if (req.path.match(/\.(jpg|jpeg|png|gif|svg|ico)$/i)) {
        const filename = path.basename(req.path);
        const filePath = path.join(__dirname, 'uploads', filename);
        
        console.log(`[MIDDLEWARE] Intercepting image request: ${req.path}`);
        console.log(`[MIDDLEWARE] Looking for file: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
            const mimeType = mime.lookup(filename);
            console.log(`[MIDDLEWARE] File found, serving with MIME type: ${mimeType}`);
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('X-Served-By', 'custom-middleware');
            
            return res.sendFile(filePath);
        }
    }
    next();
});

// Parse URL-encoded bodies (for form data) with a generous limit
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// URGENT: Move image routes BEFORE all other routes to prevent React app fallback
// This must be the FIRST middleware after CORS
console.log('Setting up URGENT image routes...');

// Most important - move this to the very top after CORS
app.get('/DefaultAvatar.jpeg', (req, res) => {
    console.log(`[URGENT ROUTE] Direct access to DefaultAvatar.jpeg`);
    const filePath = path.join(__dirname, 'uploads', 'DefaultAvatar.jpeg');
    
    if (!fs.existsSync(filePath)) {
        console.log(`[URGENT ROUTE] File not found at: ${filePath}`);
        return res.status(404).json({ message: 'DefaultAvatar not found' });
    }
    
    console.log(`[URGENT ROUTE] Serving DefaultAvatar.jpeg`);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache'); 
    res.setHeader('Expires', '0');
    res.setHeader('X-Served-By', 'urgent-route');
    res.setHeader('X-Debug', 'bypass-everything');
    
    return res.sendFile(filePath);
});

// Simple test route
app.get("/test", (req, res) => {
    res.send("Hello World! This is a test route.");
});

// Debug route to test image serving
app.get("/debug/image/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    console.log(`[DEBUG IMAGE] Requesting: ${filename}`);
    console.log(`[DEBUG IMAGE] File path: ${filePath}`);
    console.log(`[DEBUG IMAGE] File exists: ${fs.existsSync(filePath)}`);
    console.log(`[DEBUG IMAGE] Request headers:`, req.headers);
    
    if (!fs.existsSync(filePath)) {
        console.log(`[DEBUG IMAGE] File not found: ${filename}`);
        return res.status(404).json({ message: 'Image not found' });
    }
    
    const stats = fs.statSync(filePath);
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    
    console.log(`[DEBUG IMAGE] File size: ${stats.size} bytes`);
    console.log(`[DEBUG IMAGE] MIME type: ${mimeType}`);
    
    // Set headers explicitly
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Custom-Image-Debug', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    console.log(`[DEBUG IMAGE] Response headers set for: ${filename}`);
    
    // Send file
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`[DEBUG IMAGE] Error sending file: ${err}`);
        } else {
            console.log(`[DEBUG IMAGE] File sent successfully: ${filename}`);
        }
    });
});

// Route to force refresh static files and bypass cache
app.get('/force-refresh/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    console.log(`[FORCE REFRESH] Requesting: ${filename}`);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    const stats = fs.statSync(filePath);
    
    // Set headers to bypass all caches
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Served-By', 'force-refresh');
    res.setHeader('X-Timestamp', Date.now().toString());
    
    // Add random query to bypass CDN cache
    res.setHeader('Vary', 'Accept-Encoding, User-Agent');
    
    console.log(`[FORCE REFRESH] Serving ${filename} with MIME: ${mimeType}`);
    res.sendFile(filePath);
});

// Alternative route using streaming to serve images
app.get('/stream/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Explicitly set content type based on extension
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
    }
    
    const stat = fs.statSync(filePath);
    
    console.log(`[STREAM] Serving ${filename} as ${contentType}`);
    
    // Set headers before streaming
    res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Served-By': 'stream-method'
    });
    
    // Create read stream and pipe to response
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
});

// Routes
// These routes handle different API endpoints for your application
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const withdraw = require("./controller/withdraw");

// Mount routes at their respective base paths
app.use("/api/v2/user", user);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/withdraw", withdraw);

// Root route (should be last among specific routes)
app.get("/", (req, res) => {
    res.send("Welcome to the server!");
});

// Debug route to catch any unhandled requests
app.get('*', (req, res, next) => {
    console.log(`[UNHANDLED REQUEST] ${req.method} ${req.url}`);
    console.log(`[UNHANDLED REQUEST] Headers:`, req.headers);
    next();
});

// Error handling middleware
// This should always be the last middleware loaded
app.use(ErrorHandler);

// Handling Uncaught Exceptions
// Catches synchronous errors not handled by try/catch blocks
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server for handling UNCAUGHT EXCEPTION! 💥`);
    process.exit(1); // Exit with a failure code
});

// Initialize OQS Signature module (generate/load keys)
// The server will only start listening for requests AFTER this initialization is complete.
initOQSSignature().then(() => {
    // Start the server only after OQS initialization is successful
    const server = app.listen(process.env.PORT, () => {
        console.log(`Server is working on http://localhost:${process.env.PORT}`);
    });

    // Unhandled promise rejection
    // Catches asynchronous errors from Promises that are not caught
    process.on('unhandledRejection', (err) => {
        console.log(`Error: ${err.message}`);
        console.log('Shutting down the server due to unhandled promise rejection');
        server.close(() => {
            process.exit(1); // Exit with a failure code
        });
    });
}).catch(err => {
    // If OQS initialization fails, log the error and exit the process
    console.error("Failed to initialize OQS signature module, server not starting:", err);
    process.exit(1); // Exit immediately if OQS init fails, as it's critical
});

// Special route to purge cache and serve with unique timestamp
app.get('/purge-cache/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    const stats = fs.statSync(filePath);
    const timestamp = Date.now();
    
    console.log(`[PURGE CACHE] Serving ${filename} with timestamp: ${timestamp}`);
    
    // Force no cache with unique headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Served-By', 'purge-cache');
    res.setHeader('X-Timestamp', timestamp.toString());
    res.setHeader('X-Cache-Bypass', 'true');
    res.setHeader('Vary', '*');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${timestamp}-${stats.size}"`);
    
    // Add CloudFlare specific headers to bypass cache
    res.setHeader('CF-Cache-Status', 'BYPASS');
    res.setHeader('CF-APO-Via', 'tcache');
    
    res.sendFile(filePath);
});

// Test page to show all image serving methods
app.get('/image-test', (req, res) => {
    const timestamp = Date.now();
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Image Serving Test - ${timestamp}</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .method { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
                .method h3 { margin-top: 0; }
                .method img { max-width: 100px; margin: 10px; border: 2px solid #333; }
                .method a { display: block; margin: 5px 0; color: blue; }
                .success { color: green; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <h1>Image Serving Test</h1>
            <p>Timestamp: ${timestamp}</p>
            
            <div class="method">
                <h3>1. Static Route (/uploads/)</h3>
                <a href="/uploads/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/uploads/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/uploads/DefaultAvatar.jpeg?t=${timestamp}" alt="Static Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>2. Direct Route (root level)</h3>
                <a href="/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/DefaultAvatar.jpeg?t=${timestamp}" alt="Direct Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>3. Debug Route</h3>
                <a href="/debug/image/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/debug/image/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/debug/image/DefaultAvatar.jpeg?t=${timestamp}" alt="Debug Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>4. Force Refresh Route</h3>
                <a href="/force-refresh/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/force-refresh/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/force-refresh/DefaultAvatar.jpeg?t=${timestamp}" alt="Force Refresh Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>5. Stream Route</h3>
                <a href="/stream/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/stream/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/stream/DefaultAvatar.jpeg?t=${timestamp}" alt="Stream Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>6. Purge Cache Route</h3>
                <a href="/purge-cache/DefaultAvatar.jpeg?t=${timestamp}" target="_blank">/purge-cache/DefaultAvatar.jpeg?t=${timestamp}</a>
                <br><img src="/purge-cache/DefaultAvatar.jpeg?t=${timestamp}" alt="Purge Cache Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <div class="method">
                <h3>7. Timestamped File Route (NEW FILE)</h3>
                <a href="/timestamped/DefaultAvatar-${timestamp}.jpeg" target="_blank">/timestamped/DefaultAvatar-${timestamp}.jpeg</a>
                <br><img src="/timestamped/DefaultAvatar-${timestamp}.jpeg" alt="Timestamped Route" onerror="this.style.border='2px solid red'" onload="this.style.border='2px solid green'">
            </div>
            
            <script>
                // Auto refresh every 10 seconds
                setTimeout(() => {
                    window.location.reload();
                }, 10000);
            </script>
        </body>
        </html>
    `);
});

// Route for timestamped files to bypass cache completely
app.get('/timestamped/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Also check for DefaultAvatar with timestamp
    if (!fs.existsSync(filePath) && filename.startsWith('DefaultAvatar-')) {
        // Find the latest DefaultAvatar-timestamp file
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            const files = fs.readdirSync(uploadDir)
                .filter(f => f.startsWith('DefaultAvatar-') && f.endsWith('.jpeg'))
                .sort()
                .reverse();
            
            if (files.length > 0) {
                const latestFile = path.join(uploadDir, files[0]);
                console.log(`[TIMESTAMPED] Using latest file: ${files[0]}`);
                
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('X-Served-By', 'timestamped-latest');
                return res.sendFile(latestFile);
            }
        } catch (err) {
            console.error('Error reading upload directory:', err);
        }
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    
    console.log(`[TIMESTAMPED] Serving: ${filename}`);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Served-By', 'timestamped');
    res.sendFile(filePath);
});
