const express = require("express");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();

const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

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
        origin: "http://localhost:3000", // Allow requests from your client application
        credentials: true, // Allow sending cookies with requests
    })
);

// Serve static files from the 'uploads' directory
app.use("/", express.static("uploads"));

// Parse URL-encoded bodies (for form data) with a generous limit
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));


// Simple test route
app.get("/test", (req, res) => {
    res.send("Hello World! This is a test route.");
});

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to the server!");
});

// Routes
// These routes handle different API endpoints for your application
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const message = require("./controller/message");
const conversation = require("./controller/conversation");
const withdraw = require("./controller/withdraw");

// Mount routes at their respective base paths
app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/withdraw", withdraw); // Moved this up for better grouping

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
