const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // For general crypto utils, like hashing

// Load the compiled native addon
const oqsAddon = require('./oqs-addon/build/Release/oqs_addon');

// Define the path for key storage
const KEYS_DIR = path.join(__dirname, '../config/oqs_keys');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'oqs_public.pem');
const SECRET_KEY_PATH = path.join(KEYS_DIR, 'oqs_secret.pem');

// Ensure the keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Generates a new ML-DSA key pair and saves them to files.
 * @returns {Promise<{publicKey: Buffer, secretKey: Buffer}>}
 */
async function generateAndSaveOQSKeyPair() {
    console.log(`Generating ML-DSA key pair using ${oqsAddon.algorithm}...`);
    const { publicKey, secretKey } = oqsAddon.generateKeyPair();

    // Convert Buffer to Base64 or Hex for easier storage if needed, or store as binary
    // For PEM-like format, you might add headers/footers, but for simplicity, raw binary is fine for now.
    // In a real scenario, you'd use a more robust key serialization.
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey); // Store as binary for simplicity
    fs.writeFileSync(SECRET_KEY_PATH, secretKey); // Store as binary for simplicity

    console.log('ML-DSA key pair generated and saved.');
    return { publicKey, secretKey };
}

/**
 * Loads an existing ML-DSA key pair from files.
 * If keys don't exist, it generates new ones.
 * @returns {Promise<{publicKey: Buffer, secretKey: Buffer}>}
 */
async function loadOrGenerateOQSKeyPair() {
    if (fs.existsSync(PUBLIC_KEY_PATH) && fs.existsSync(SECRET_KEY_PATH)) {
        console.log('Loading existing ML-DSA key pair...');
        const publicKey = fs.readFileSync(PUBLIC_KEY_PATH);
        const secretKey = fs.readFileSync(SECRET_KEY_PATH);
        console.log('ML-DSA key pair loaded.'); // <-- Đã sửa lỗi ở đây
        return { publicKey, secretKey };
    } else {
        console.log('ML-DSA key pair not found. Generating new ones...');
        return generateAndSaveOQSKeyPair();
    }
}

let loadedKeyPair = null; // Store loaded keys in memory for performance

/**
 * Initializes the OQS signature module by loading or generating keys.
 * This should be called once when the server starts.
 */
async function initOQSSignature() {
    try {
        loadedKeyPair = await loadOrGenerateOQSKeyPair();
        console.log(`OQS Signature module initialized with algorithm: ${oqsAddon.algorithm}`);
        console.log(`Public Key Length: ${oqsAddon.publicKeyLength} bytes`);
        console.log(`Secret Key Length: ${oqsAddon.secretKeyLength} bytes`);
        console.log(`Signature Length: ${oqsAddon.signatureLength} bytes`);
    } catch (error) {
        console.error('Failed to initialize OQS Signature module:', error);
        process.exit(1); // Exit if critical key operations fail
    }
}

/**
 * Signs a message (order data) using the loaded secret key.
 * @param {Buffer | string | object} data - The data to sign. If an object, it will be JSON.stringified and hashed.
 * @returns {Buffer} The ML-DSA signature.
 */
function signOrderData(data) {
    if (!loadedKeyPair || !loadedKeyPair.secretKey) {
        throw new Error('OQS secret key not loaded. Call initOQSSignature first.');
    }

    let dataBuffer;
    if (Buffer.isBuffer(data)) {
        dataBuffer = data;
    } else if (typeof data === 'object') {
        // Important: Always hash the data before signing large objects
        // Hashing ensures fixed input size for signing and prevents malleability issues.
        // Use a strong, collision-resistant hash function like SHA256.
        const jsonData = JSON.stringify(data);
        dataBuffer = crypto.createHash('sha256').update(jsonData).digest();
    } else if (typeof data === 'string') {
        // Hash string data as well for consistency and fixed size input
        dataBuffer = crypto.createHash('sha256').update(data).digest();
    } else {
        throw new Error('Data to sign must be a Buffer, string, or object.');
    }

    // The C++ addon expects a Buffer for message and secret key
    const signature = oqsAddon.signMessage(dataBuffer, loadedKeyPair.secretKey);
    return signature;
}

/**
 * Verifies an ML-DSA signature.
 * @param {Buffer | string | object} data - The original data that was signed. (Will be hashed if object/string).
 * @param {Buffer} signature - The signature to verify.
 * @param {Buffer} publicKey - The public key to use for verification.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
function verifyOrderSignature(data, signature, publicKey) {
    if (!Buffer.isBuffer(signature) || !Buffer.isBuffer(publicKey)) {
        throw new Error('Signature and Public Key must be Buffers.');
    }

    let dataBuffer;
    if (Buffer.isBuffer(data)) {
        dataBuffer = data;
    } else if (typeof data === 'object') {
        const jsonData = JSON.stringify(data);
        dataBuffer = crypto.createHash('sha256').update(jsonData).digest();
    } else if (typeof data === 'string') {
        dataBuffer = crypto.createHash('sha256').update(data).digest();
    } else {
        throw new Error('Data to verify must be a Buffer, string, or object.');
    }

    return oqsAddon.verifyMessage(dataBuffer, signature, publicKey);
}

// Export the functions and the initialization function
module.exports = {
    initOQSSignature,
    signOrderData,
    verifyOrderSignature,
    getPublicKey: () => loadedKeyPair ? loadedKeyPair.publicKey : null, // To send public key to client if needed
    getAlgorithm: () => oqsAddon.algorithm // Expose algorithm name
};
