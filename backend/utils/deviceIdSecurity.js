const crypto = require('crypto');
const AES_KEY = Buffer.from(process.env.AES_KEY, 'hex'); // 32 bytes
const EC = require('elliptic').ec;
const ec = new EC('p256'); // hoặc 'secp256k1'
const PRIVATE_KEY = process.env.EC_PRIVATE_KEY; // sinh bằng ec.genKeyPair().getPrivate('hex')

function encryptDeviceId(deviceId) {
  // Tạo IV/nonce ngẫu nhiên cho mỗi lần mã hóa (12 bytes cho GCM)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  
  let encrypted = cipher.update(deviceId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Lấy authentication tag
  const authTag = cipher.getAuthTag();
  
  // Kết hợp IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptDeviceId(encryptedData) {
  // Tách IV, authTag và encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(authTag);
  
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
  const key = ec.keyFromPublic(publicKey, 'hex');
  return key.verify(encryptedDeviceId, signature);
}

module.exports = {
  encryptDeviceId,
  decryptDeviceId,
  signDeviceId,
  verifyDeviceId
};