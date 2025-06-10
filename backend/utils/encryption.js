const crypto = require('crypto');

// Lấy key và IV từ biến môi trường
const AES_KEY_DATABASE = process.env.AES_KEY_DATABASE ? Buffer.from(process.env.AES_KEY_DATABASE, 'hex') : null;
const AES_IV_DATABASE = process.env.AES_IV_DATABASE ? Buffer.from(process.env.AES_IV_DATABASE, 'hex') : null;

// Kiểm tra xem keys có được set không
if (!AES_KEY_DATABASE || !AES_IV_DATABASE) {
    console.error('⚠️  AES_KEY_DATABASE or AES_IV_DATABASE not set in environment variables');
    console.error('Please check your .env file');
}

// Mã hóa dữ liệu
function encrypt(text) {
    if (!text || text === null || text === undefined) {
        return null;
    }
    
    if (!AES_KEY_DATABASE || !AES_IV_DATABASE) {
        console.error('Encryption keys not available, returning original text');
        return text;
    }
    
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY_DATABASE, AES_IV_DATABASE);
        let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return text; // Trả về text gốc nếu mã hóa thất bại
    }
}

// Giải mã dữ liệu
function decrypt(encryptedText) {
    if (!encryptedText || encryptedText === null || encryptedText === undefined) {
        return null;
    }
    
    if (!AES_KEY_DATABASE || !AES_IV_DATABASE) {
        console.error('Decryption keys not available, returning original text');
        return encryptedText;
    }
    
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY_DATABASE, AES_IV_DATABASE);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedText; // Trả về encrypted text nếu giải mã thất bại
    }
}

// Mã hóa số điện thoại
function encryptPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    return encrypt(phoneNumber.toString());
}

// Giải mã số điện thoại
function decryptPhoneNumber(encryptedPhoneNumber) {
    if (!encryptedPhoneNumber) return null;
    const decrypted = decrypt(encryptedPhoneNumber);
    return decrypted ? parseInt(decrypted) : null;
}

// Mã hóa địa chỉ
function encryptAddress(address) {
    if (!address) return null;
    return encrypt(address);
}

// Giải mã địa chỉ
function decryptAddress(encryptedAddress) {
    if (!encryptedAddress) return null;
    return decrypt(encryptedAddress);
}

// Mã hóa giá tiền
function encryptPrice(price) {
    if (!price && price !== 0) return null;
    return encrypt(price.toString());
}

// Giải mã giá tiền
function decryptPrice(encryptedPrice) {
    if (!encryptedPrice) return null;
    const decrypted = decrypt(encryptedPrice);
    return decrypted ? parseFloat(decrypted) : null;
}

// Mã hóa amount (số tiền)
function encryptAmount(amount) {
    if (!amount && amount !== 0) return null;
    return encrypt(amount.toString());
}

// Giải mã amount (số tiền)
function decryptAmount(encryptedAmount) {
    if (!encryptedAmount) return null;
    const decrypted = decrypt(encryptedAmount);
    return decrypted ? parseFloat(decrypted) : null;
}

// Giải mã object chứa các trường cần giải mã
function decryptUserData(user) {
    if (!user) return user;
    
    const decryptedUser = { ...user };
    
    // Giải mã phoneNumber
    if (user.phoneNumber) {
        decryptedUser.phoneNumber = decryptPhoneNumber(user.phoneNumber);
    }
    
    // Giải mã addresses
    if (user.addresses && Array.isArray(user.addresses)) {
        decryptedUser.addresses = user.addresses.map(addr => ({
            ...addr,
            address: decryptAddress(addr.address)
        }));
    }
    
    return decryptedUser;
}

// Giải mã shop data
function decryptShopData(shop) {
    if (!shop) return shop;
    
    const decryptedShop = { ...shop };
    
    // Giải mã phoneNumber và address
    if (shop.phoneNumber) {
        decryptedShop.phoneNumber = decryptPhoneNumber(shop.phoneNumber);
    }
    
    if (shop.address) {
        decryptedShop.address = decryptAddress(shop.address);
    }
    
    // Giải mã availableBalance
    if (shop.availableBalance) {
        decryptedShop.availableBalance = decryptAmount(shop.availableBalance);
    }
    
    // Giải mã transactions
    if (shop.transections && Array.isArray(shop.transections)) {
        decryptedShop.transections = shop.transections.map(transaction => ({
            ...transaction,
            amount: decryptAmount(transaction.amount)
        }));
    }
    
    return decryptedShop;
}

// Giải mã order data
function decryptOrderData(order) {
    if (!order) return order;
    
    const decryptedOrder = { ...order };
    
    // Giải mã totalPrice
    if (order.totalPrice) {
        decryptedOrder.totalPrice = decryptPrice(order.totalPrice);
    }
    
    // Giải mã shippingAddress
    if (order.shippingAddress && order.shippingAddress.address) {
        decryptedOrder.shippingAddress = {
            ...order.shippingAddress,
            address: decryptAddress(order.shippingAddress.address)
        };
    }
    
    return decryptedOrder;
}

// Giải mã withdraw data
function decryptWithdrawData(withdraw) {
    if (!withdraw) return withdraw;
    
    const decryptedWithdraw = { ...withdraw };
    
    // Giải mã amount
    if (withdraw.amount) {
        decryptedWithdraw.amount = decryptAmount(withdraw.amount);
    }
    
    return decryptedWithdraw;
}

module.exports = {
    encrypt,
    decrypt,
    encryptPhoneNumber,
    decryptPhoneNumber,
    encryptAddress,
    decryptAddress,
    encryptPrice,
    decryptPrice,
    encryptAmount,
    decryptAmount,
    decryptUserData,
    decryptShopData,
    decryptOrderData,
    decryptWithdrawData
};
