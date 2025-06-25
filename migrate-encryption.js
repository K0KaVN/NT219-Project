const mongoose = require('mongoose');
const User = require('./backend/model/user');
const Shop = require('./backend/model/shop');
const Order = require('./backend/model/order');
const Withdraw = require('./backend/model/withdraw');
const CoupounCode = require('./backend/model/coupounCode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: './backend/config/.env' });

// Connect to MongoDB
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Encryption functions (same as in utils/encryption.js)
const AES_KEY_DATABASE = Buffer.from(process.env.AES_KEY_DATABASE, 'hex');
const AES_IV_DATABASE = Buffer.from(process.env.AES_IV_DATABASE, 'hex');

function encrypt(text) {
    if (!text || text === null || text === undefined) {
        return null;
    }
    
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY_DATABASE, AES_IV_DATABASE);
        let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
}

async function migrateUsers() {
    console.log('Starting User migration...');
    
    const users = await User.find({}).select('+phoneNumber +addresses');
    
    for (let user of users) {
        let needsUpdate = false;
        
        // Check if phoneNumber is not encrypted (is a number)
        if (user.phoneNumber && typeof user.phoneNumber === 'number') {
            user.phoneNumber = encrypt(user.phoneNumber.toString());
            needsUpdate = true;
        }
        
        // Check if addresses are not encrypted
        if (user.addresses && user.addresses.length > 0) {
            user.addresses = user.addresses.map(addr => {
                if (addr.address && !addr.address.match(/^[0-9a-f]+$/i)) {
                    return {
                        ...addr,
                        address: encrypt(addr.address)
                    };
                }
                return addr;
            });
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await User.updateOne({ _id: user._id }, {
                phoneNumber: user.phoneNumber,
                addresses: user.addresses
            });
            console.log(`Updated user: ${user._id}`);
        }
    }
    
    console.log('User migration completed!');
}

async function migrateShops() {
    console.log('Starting Shop migration...');
    
    const shops = await Shop.find({});
    
    for (let shop of shops) {
        let needsUpdate = false;
        const updateData = {};
        
        // Check if phoneNumber is not encrypted (is a number)
        if (shop.phoneNumber && typeof shop.phoneNumber === 'number') {
            updateData.phoneNumber = encrypt(shop.phoneNumber.toString());
            needsUpdate = true;
        }
        
        // Check if address is not encrypted
        if (shop.address && !shop.address.match(/^[0-9a-f]+$/i)) {
            updateData.address = encrypt(shop.address);
            needsUpdate = true;
        }
        
        // Check if availableBalance is not encrypted (is a number)
        if (shop.availableBalance !== undefined && typeof shop.availableBalance === 'number') {
            updateData.availableBalance = encrypt(shop.availableBalance.toString());
            needsUpdate = true;
        }
        
        // Check if transactions amounts are not encrypted
        if (shop.transections && shop.transections.length > 0) {
            updateData.transections = shop.transections.map(transaction => {
                if (transaction.amount && typeof transaction.amount === 'number') {
                    return {
                        ...transaction,
                        amount: encrypt(transaction.amount.toString())
                    };
                }
                return transaction;
            });
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await Shop.updateOne({ _id: shop._id }, updateData);
            console.log(`Updated shop: ${shop._id}`);
        }
    }
    
    console.log('Shop migration completed!');
}

async function migrateOrders() {
    console.log('Starting Order migration...');
    
    const orders = await Order.find({});
    
    for (let order of orders) {
        let needsUpdate = false;
        const updateData = {};
        
        // Check if totalPrice is not encrypted (is a number)
        if (order.totalPrice && typeof order.totalPrice === 'number') {
            updateData.totalPrice = encrypt(order.totalPrice.toString());
            needsUpdate = true;
        }
        
        // Check if shippingAddress.address is not encrypted
        if (order.shippingAddress && order.shippingAddress.address && 
            !order.shippingAddress.address.match(/^[0-9a-f]+$/i)) {
            updateData.shippingAddress = {
                ...order.shippingAddress,
                address: encrypt(order.shippingAddress.address)
            };
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await Order.updateOne({ _id: order._id }, updateData);
            console.log(`Updated order: ${order._id}`);
        }
    }
    
    console.log('Order migration completed!');
}

async function migrateWithdraws() {
    console.log('Starting Withdraw migration...');
    
    const withdraws = await Withdraw.find({});
    
    for (let withdraw of withdraws) {
        let needsUpdate = false;
        
        // Check if amount is not encrypted (is a number)
        if (withdraw.amount && typeof withdraw.amount === 'number') {
            await Withdraw.updateOne({ _id: withdraw._id }, {
                amount: encrypt(withdraw.amount.toString())
            });
            console.log(`Updated withdraw: ${withdraw._id}`);
            needsUpdate = true;
        }
    }
    
    console.log('Withdraw migration completed!');
}

async function migrateCoupons() {
    console.log('Starting Coupon migration...');
    
    const coupons = await CoupounCode.find({});
    
    for (let coupon of coupons) {
        // Check if name is not hashed (doesn't look like bcrypt hash)
        if (coupon.name && !coupon.name.startsWith('$2')) {
            const hashedName = await bcrypt.hash(coupon.name, 10);
            await CoupounCode.updateOne({ _id: coupon._id }, {
                name: hashedName
            });
            console.log(`Updated coupon: ${coupon._id} - ${coupon.name} -> ${hashedName}`);
        }
    }
    
    console.log('Coupon migration completed!');
}

async function runMigration() {
    try {
        console.log('Starting database migration for encryption...');
        
        await migrateUsers();
        await migrateShops();
        await migrateOrders();
        await migrateWithdraws();
        await migrateCoupons();
        
        console.log('All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
