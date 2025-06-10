const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { verifyOrderSignature, getExpectedLengths } = require('../utils/oqsSignature');

// Debug endpoint to test ML-DSA functionality
router.post(
    "/test-mldsa",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { mlDsaSignature, mlDsaPublicKey, mlDsaAlgorithm, orderData } = req.body;

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
