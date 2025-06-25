const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { verifyOrderSignature, getExpectedLengths, signOrderData, getPublicKey, getAlgorithm } = require('../utils/oqsSignature');

// Test device ID logic
router.get(
    "/test-device-id",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { encryptDeviceId, decryptDeviceId, signDeviceId, verifyDeviceId } = require('../utils/deviceIdSecurity');
            const crypto = require('crypto');
            
            // Test device ID generation and verification
            const testDeviceId = crypto.randomBytes(16).toString('hex');
            const encryptedDeviceId = encryptDeviceId(testDeviceId);
            const signature = signDeviceId(encryptedDeviceId);
            
            // Test verification
            const PUBLIC_KEY = process.env.EC_PUBLIC_KEY && process.env.EC_PUBLIC_KEY.trim();
            const isValid = verifyDeviceId(encryptedDeviceId, signature, PUBLIC_KEY);
            
            // Test decryption
            const decryptedDeviceId = decryptDeviceId(encryptedDeviceId);
            
            res.status(200).json({
                success: true,
                test: {
                    originalDeviceId: testDeviceId,
                    encryptedDeviceId,
                    signature,
                    signatureLength: signature ? signature.length : null,
                    publicKeyExists: !!PUBLIC_KEY,
                    publicKeyLength: PUBLIC_KEY ? PUBLIC_KEY.length : null,
                    publicKeyFormat: PUBLIC_KEY ? PUBLIC_KEY.substring(0, 10) + '...' : null,
                    isSignatureValid: isValid,
                    decryptedDeviceId,
                    decryptionMatch: testDeviceId === decryptedDeviceId
                }
            });
        } catch (error) {
            console.error('Device ID test error:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                stack: error.stack
            });
        }
    })
);

// Simple GET endpoint to test if debug routes work
router.get(
    "/test-mldsa",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const expectedLengths = getExpectedLengths();
            
            res.status(200).json({
                success: true,
                message: "ML-DSA debug endpoint is working",
                expectedLengths,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Debug GET error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    })
);

// Debug endpoint to test ML-DSA functionality
router.post(
    "/test-mldsa",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { mlDsaSignature, mlDsaPublicKey, mlDsaAlgorithm, orderData } = req.body;
            
            // If no ML-DSA data provided, create a test case
            if (!mlDsaSignature && !mlDsaPublicKey && !orderData) {
                const testOrderData = {
                    cart: [{ productId: "test123", qty: 1, price: 100, shopId: "shop123" }],
                    user: { _id: "user123" },
                    totalPrice: 100,
                    shippingAddress: { address: "Test Address", province: "Test Province", country: "Test Country" }
                };
                
                try {
                    const testSignature = signOrderData(testOrderData);
                    const testPublicKey = getPublicKey();
                    
                    const isValid = verifyOrderSignature(testOrderData, testSignature, testPublicKey);
                    
                    return res.status(200).json({
                        success: true,
                        message: "Test ML-DSA signature created and verified",
                        testResult: {
                            isSignatureValid: isValid,
                            signatureLength: testSignature.length,
                            publicKeyLength: testPublicKey.length,
                            algorithm: getAlgorithm()
                        },
                        expectedLengths: getExpectedLengths()
                    });
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Test signature creation/verification failed",
                        error: error.message
                    });
                }
            }

            console.log('Debug ML-DSA test received:');
            console.log('- Signature type:', typeof mlDsaSignature);
            console.log('- Public key type:', typeof mlDsaPublicKey);
            console.log('- Signature length:', mlDsaSignature ? mlDsaSignature.length : 'null');
            console.log('- Public key length:', mlDsaPublicKey ? mlDsaPublicKey.length : 'null');
            console.log('- Algorithm:', mlDsaAlgorithm);

            // Convert to buffers
            let signatureBuffer = mlDsaSignature;
            let publicKeyBuffer = mlDsaPublicKey;

            if (typeof mlDsaSignature === 'string') {
                try {
                    signatureBuffer = Buffer.from(mlDsaSignature, 'base64');
                } catch (error) {
                    signatureBuffer = Buffer.from(mlDsaSignature, 'hex');
                }
            }
            
            if (typeof mlDsaPublicKey === 'string') {
                try {
                    publicKeyBuffer = Buffer.from(mlDsaPublicKey, 'base64');
                } catch (error) {
                    publicKeyBuffer = Buffer.from(mlDsaPublicKey, 'hex');
                }
            }

            console.log('After conversion:');
            console.log('- Signature buffer length:', signatureBuffer.length);
            console.log('- Public key buffer length:', publicKeyBuffer.length);

            const expectedLengths = getExpectedLengths();
            console.log('Expected lengths:', expectedLengths);

            let verificationResult = null;
            let verificationError = null;

            if (orderData) {
                try {
                    verificationResult = verifyOrderSignature(orderData, signatureBuffer, publicKeyBuffer);
                } catch (error) {
                    verificationError = error.message;
                }
            }

            res.status(200).json({
                success: true,
                debug: {
                    originalSignatureType: typeof mlDsaSignature,
                    originalPublicKeyType: typeof mlDsaPublicKey,
                    originalSignatureLength: mlDsaSignature ? mlDsaSignature.length : null,
                    originalPublicKeyLength: mlDsaPublicKey ? mlDsaPublicKey.length : null,
                    bufferSignatureLength: signatureBuffer.length,
                    bufferPublicKeyLength: publicKeyBuffer.length,
                    expectedLengths,
                    algorithm: mlDsaAlgorithm,
                    verificationResult,
                    verificationError
                }
            });
        } catch (error) {
            console.error("Debug ML-DSA test error:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    })
);

module.exports = router;
