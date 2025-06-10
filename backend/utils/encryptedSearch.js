const User = require('../model/user');
const Shop = require('../model/shop');
const Order = require('../model/order');
const { encryptPhoneNumber, encryptAddress, decryptPhoneNumber, decryptAddress } = require('./encryption');

// Helper function để tìm user bằng số điện thoại
async function findUserByPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Lấy tất cả users và so sánh số điện thoại sau khi giải mã
    const users = await User.find({});
    
    for (let user of users) {
        if (user.phoneNumber) {
            const decryptedPhone = decryptPhoneNumber(user.phoneNumber);
            if (decryptedPhone && decryptedPhone.toString() === phoneNumber.toString()) {
                return user;
            }
        }
    }
    
    return null;
}

// Helper function để tìm shop bằng số điện thoại
async function findShopByPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    const shops = await Shop.find({});
    
    for (let shop of shops) {
        if (shop.phoneNumber) {
            const decryptedPhone = decryptPhoneNumber(shop.phoneNumber);
            if (decryptedPhone && decryptedPhone.toString() === phoneNumber.toString()) {
                return shop;
            }
        }
    }
    
    return null;
}

// Helper function để tìm user bằng địa chỉ
async function findUsersByAddress(addressKeyword) {
    if (!addressKeyword) return [];
    
    const users = await User.find({});
    const matchedUsers = [];
    
    for (let user of users) {
        if (user.addresses && user.addresses.length > 0) {
            for (let addr of user.addresses) {
                if (addr.address) {
                    const decryptedAddress = decryptAddress(addr.address);
                    if (decryptedAddress && decryptedAddress.toLowerCase().includes(addressKeyword.toLowerCase())) {
                        matchedUsers.push(user);
                        break; // Avoid duplicate users
                    }
                }
            }
        }
    }
    
    return matchedUsers;
}

// Helper function để tìm shop bằng địa chỉ
async function findShopsByAddress(addressKeyword) {
    if (!addressKeyword) return [];
    
    const shops = await Shop.find({});
    const matchedShops = [];
    
    for (let shop of shops) {
        if (shop.address) {
            const decryptedAddress = decryptAddress(shop.address);
            if (decryptedAddress && decryptedAddress.toLowerCase().includes(addressKeyword.toLowerCase())) {
                matchedShops.push(shop);
            }
        }
    }
    
    return matchedShops;
}

// Helper function để tìm orders theo khoảng giá
async function findOrdersByPriceRange(minPrice, maxPrice) {
    const orders = await Order.find({});
    const matchedOrders = [];
    
    for (let order of orders) {
        if (order.totalPrice) {
            const decryptedPrice = parseFloat(order.toJSON().totalPrice); // Sử dụng toJSON để tự động giải mã
            if (decryptedPrice >= minPrice && decryptedPrice <= maxPrice) {
                matchedOrders.push(order);
            }
        }
    }
    
    return matchedOrders;
}

// Helper function để update user phone number
async function updateUserPhoneNumber(userId, newPhoneNumber) {
    const encryptedPhone = encryptPhoneNumber(newPhoneNumber);
    return await User.findByIdAndUpdate(userId, { phoneNumber: encryptedPhone }, { new: true });
}

// Helper function để update user address
async function updateUserAddress(userId, addressIndex, newAddress) {
    const user = await User.findById(userId);
    if (!user || !user.addresses[addressIndex]) {
        return null;
    }
    
    user.addresses[addressIndex].address = newAddress; // Will be encrypted by pre-save hook
    await user.save();
    return user;
}

// Helper function để update shop contact info
async function updateShopContactInfo(shopId, newPhoneNumber, newAddress) {
    const updateData = {};
    
    if (newPhoneNumber) {
        updateData.phoneNumber = encryptPhoneNumber(newPhoneNumber);
    }
    
    if (newAddress) {
        updateData.address = encryptAddress(newAddress);
    }
    
    return await Shop.findByIdAndUpdate(shopId, updateData, { new: true });
}

module.exports = {
    findUserByPhoneNumber,
    findShopByPhoneNumber,
    findUsersByAddress,
    findShopsByAddress,
    findOrdersByPriceRange,
    updateUserPhoneNumber,
    updateUserAddress,
    updateShopContactInfo
};
