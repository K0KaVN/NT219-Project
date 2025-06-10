const crypto = require('crypto');
const AES_KEY = Buffer.from(process.env.AES_KEY, 'hex'); // 32 bytes
const AES_IV = Buffer.from(process.env.AES_IV, 'hex');   // 16 bytes
const EC = require('elliptic').ec;
const ec = new EC('p256'); // hoặc 'secp256k1'
const PRIVATE_KEY = process.env.EC_PRIVATE_KEY; // sinh bằng ec.genKeyPair().getPrivate('hex')

function encryptDeviceId(deviceId) {
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(deviceId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptDeviceId(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


function signDeviceId(encryptedDeviceId) {
  const key = ec.keyFromPrivate(PRIVATE_KEY, 'hex');
  const signature = key.sign(encryptedDeviceId);
  return signature.toDER('hex');
}

function verifyDeviceId(encryptedDeviceId, signature, publicKey) {
  try {
    console.log('🔍 Signature Verification Debug:');
    console.log('- encryptedDeviceId:', encryptedDeviceId);
    console.log('- signature:', signature);
    console.log('- publicKey:', publicKey);
    
    const key = ec.keyFromPublic(publicKey, 'hex');
    console.log('- Key created successfully');
    
    const result = key.verify(encryptedDeviceId, signature);
    console.log('- Verification result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

module.exports = {
  encryptDeviceId,
  decryptDeviceId,
  signDeviceId,
  verifyDeviceId
};