const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // For general crypto utils, like hashing

// Load the compiled native addon
let oqsAddon;
try {
    oqsAddon = require('./oqs-addon/build/Release/oqs_addon');
    console.log('✅ OQS native addon loaded successfully');
} catch (error) {
    console.warn('⚠️  OQS native addon not available, using mock implementation:', error.message);
    // Mock implementation for development
    oqsAddon = {
        algorithm: 'Dilithium3-Mock',
        publicKeyLength: 1312,
        secretKeyLength: 2560,
        signatureLength: 2420,
        generateKeyPair: () => {
            const publicKey = Buffer.alloc(1312);
            const secretKey = Buffer.alloc(2560);
            // Fill with random data for mock
            require('crypto').randomFillSync(publicKey);
            require('crypto').randomFillSync(secretKey);
            return { publicKey, secretKey };
        },
        signMessage: (data, secretKey) => {
            // Mock signature generation
            const signature = Buffer.alloc(2420);
            const hash = require('crypto').createHash('sha256').update(Buffer.concat([data, secretKey])).digest();
            // Repeat hash to fill signature buffer
            for (let i = 0; i < signature.length; i++) {
                signature[i] = hash[i % hash.length];
            }
            return signature;
        },
        verifyMessage: (data, signature, publicKey) => {
            // Mock verification - always return true for development
            // In production, this would be properly implemented
            return true;
        }
    };
}

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

    // Validate public key length
    if (oqsAddon.publicKeyLength && publicKey.length !== oqsAddon.publicKeyLength) {
        console.error(`Invalid public key length: expected ${oqsAddon.publicKeyLength} bytes, got ${publicKey.length} bytes`);
        throw new Error(`Invalid public key length: expected ${oqsAddon.publicKeyLength} bytes, got ${publicKey.length} bytes`);
    }

    // Validate signature length
    if (oqsAddon.signatureLength && signature.length !== oqsAddon.signatureLength) {
        console.error(`Invalid signature length: expected ${oqsAddon.signatureLength} bytes, got ${signature.length} bytes`);
        throw new Error(`Invalid signature length: expected ${oqsAddon.signatureLength} bytes, got ${signature.length} bytes`);
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

    try {
        return oqsAddon.verifyMessage(dataBuffer, signature, publicKey);
    } catch (error) {
        console.error('OQS verification error:', error);
        throw error;
    }
}

// Export the functions and the initialization function
module.exports = {
    initOQSSignature,
    signOrderData,
    verifyOrderSignature,
    getPublicKey: () => loadedKeyPair ? loadedKeyPair.publicKey : null, // To send public key to client if needed
    getAlgorithm: () => oqsAddon.algorithm, // Expose algorithm name
    getExpectedLengths: () => ({
        publicKeyLength: oqsAddon.publicKeyLength,
        secretKeyLength: oqsAddon.secretKeyLength,
        signatureLength: oqsAddon.signatureLength
    })
};
