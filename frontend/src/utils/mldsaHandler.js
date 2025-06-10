// ML-DSA utilities for frontend
// This file provides client-side ML-DSA signing capabilities

/**
 * Class to handle ML-DSA operations on the frontend
 */
class MLDSAHandler {
    constructor() {
        this.algorithm = 'Dilithium3'; // Default algorithm
        this.keyPair = null;
    }

    /**
     * Generate a new ML-DSA key pair
     * @returns {Promise<{publicKey: string, privateKey: string}>}
     */
    async generateKeyPair() {
        try {
            // In a real implementation, this would use the actual OQS library
            // For now, we'll simulate it with a placeholder
            
            // Generate random bytes for simulation
            const publicKeyBytes = new Uint8Array(1312); // Dilithium3 public key size
            const privateKeyBytes = new Uint8Array(2560); // Dilithium3 private key size
            
            // Fill with random data (in real implementation, this would be from OQS)
            crypto.getRandomValues(publicKeyBytes);
            crypto.getRandomValues(privateKeyBytes);
            
            // Convert to base64 for easier handling
            const publicKey = this.arrayBufferToBase64(publicKeyBytes);
            const privateKey = this.arrayBufferToBase64(privateKeyBytes);
            
            this.keyPair = { publicKey, privateKey };
            
            return { publicKey, privateKey };
        } catch (error) {
            console.error('Error generating ML-DSA key pair:', error);
            throw new Error('Failed to generate ML-DSA key pair');
        }
    }

    /**
     * Sign order data with the private key
     * @param {Object} orderData - The order data to sign
     * @param {string} privateKey - The private key to use for signing
     * @returns {Promise<string>} Base64 encoded signature
     */
    async signOrderData(orderData, privateKey) {
        try {
            if (!orderData || !privateKey) {
                throw new Error('Order data and private key are required');
            }

            // Prepare the data for signing (same format as backend)
            const dataForSigning = this.prepareOrderDataForSignature(orderData);
            
            // Convert to JSON and hash
            const jsonData = JSON.stringify(dataForSigning, null, 0);
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(jsonData);
            
            // Hash the data using SHA-256
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
            const hashArray = new Uint8Array(hashBuffer);
            
            // In a real implementation, this would use the actual OQS library to sign
            // For now, we'll create a simulated signature
            const signatureBytes = new Uint8Array(2420); // Dilithium3 signature size
            
            // Create a deterministic signature based on hash + private key
            // This is just for demonstration - real implementation would use OQS
            const privateKeyBytes = this.base64ToArrayBuffer(privateKey);
            const combinedData = new Uint8Array(hashArray.length + privateKeyBytes.length);
            combinedData.set(hashArray, 0);
            combinedData.set(privateKeyBytes, hashArray.length);
            
            // Generate pseudo-signature (in real implementation, this would be OQS signing)
            for (let i = 0; i < signatureBytes.length; i++) {
                signatureBytes[i] = combinedData[i % combinedData.length] ^ (i & 0xFF);
            }
            
            return this.arrayBufferToBase64(signatureBytes);
        } catch (error) {
            console.error('Error signing order data:', error);
            throw new Error('Failed to sign order data');
        }
    }

    /**
     * Prepare order data for signing (matches backend format)
     * @param {Object} orderData - Raw order data
     * @returns {Object} Normalized data for signing
     */
    prepareOrderDataForSignature(orderData) {
        return {
            userId: orderData.user._id || orderData.user,
            cart: orderData.cart.map(item => ({
                productId: item.productId || item._id,
                qty: item.qty,
                price: item.discountPrice || item.price,
                shopId: item.shopId,
            })),
            totalPrice: orderData.totalPrice,
            shippingAddress: {
                address: orderData.shippingAddress.address || null,
                province: orderData.shippingAddress.province || null,
                country: orderData.shippingAddress.country || null,
            },
            paymentInfo: {
                id: orderData.paymentInfo?.id || null,
                status: orderData.paymentInfo?.status || null,
                type: orderData.paymentInfo?.type || null,
            },
        };
    }

    /**
     * Convert ArrayBuffer to Base64 string
     * @param {ArrayBuffer} buffer 
     * @returns {string}
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to ArrayBuffer
     * @param {string} base64 
     * @returns {Uint8Array}
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Verify if the key pair is valid
     * @param {string} publicKey 
     * @param {string} privateKey 
     * @returns {boolean}
     */
    validateKeyPair(publicKey, privateKey) {
        try {
            if (!publicKey || !privateKey) return false;
            
            // Basic validation - check if keys are base64 and have correct length
            const pubKeyBytes = this.base64ToArrayBuffer(publicKey);
            const privKeyBytes = this.base64ToArrayBuffer(privateKey);
            
            return pubKeyBytes.length === 1312 && privKeyBytes.length === 2560;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate order verification info
     * @param {Object} orderData 
     * @param {string} signature 
     * @param {string} publicKey 
     * @returns {Object}
     */
    generateOrderVerificationInfo(orderData, signature, publicKey) {
        const timestamp = new Date().toISOString();
        const orderHash = this.hashOrderData(orderData);
        
        return {
            orderHash,
            signature,
            publicKey,
            algorithm: this.algorithm,
            timestamp,
            version: '1.0',
        };
    }

    /**
     * Hash order data for quick verification
     * @param {Object} orderData 
     * @returns {string}
     */
    hashOrderData(orderData) {
        const dataForSigning = this.prepareOrderDataForSignature(orderData);
        const jsonData = JSON.stringify(dataForSigning, null, 0);
        
        // Simple hash for demonstration (in real app, use crypto.subtle.digest)
        let hash = 0;
        for (let i = 0; i < jsonData.length; i++) {
            const char = jsonData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
}

// Export singleton instance
const mldsaHandler = new MLDSAHandler();
export default mldsaHandler;
