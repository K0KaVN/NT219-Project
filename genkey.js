const EC = require('elliptic').ec;
const crypto = require('crypto');
const ec = new EC('p256');
const key = ec.genKeyPair();

// Sinh AES key (256 bit) - không cần IV cố định cho GCM
const AES_KEY = crypto.randomBytes(32).toString('hex'); // 32 bytes = 256 bit

console.log('EC_PRIVATE_KEY=', key.getPrivate('hex'));
console.log('EC_PUBLIC_KEY=', key.getPublic('hex'));
console.log('AES_KEY=', AES_KEY);