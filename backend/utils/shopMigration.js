const Shop = require('../model/shop');

/**
 * Migration script to convert zipCode to province for shops
 * This script will:
 * 1. Find all shops with zipCode field
 * 2. Set a default province based on zipCode or set to "Hà Nội" as default
 * 3. Remove zipCode field (handled by schema change)
 */
const migrateShopsZipCodeToProvince = async () => {
    try {
        console.log('Starting shop zipCode to province migration...');
        
        // Find shops that don't have province field or have empty province
        const shops = await Shop.find({
            $or: [
                { province: { $exists: false } },
                { province: "" },
                { province: null }
            ]
        });
        
        let migratedCount = 0;
        
        for (const shop of shops) {
            let defaultProvince = "Hà Nội"; // Default province
            
            // Basic zipCode to province mapping (you can expand this)
            if (shop.zipCode) {
                const zipCode = shop.zipCode.toString();
                if (zipCode.startsWith('7')) {
                    defaultProvince = "TP Hồ Chí Minh";
                } else if (zipCode.startsWith('1') || zipCode.startsWith('2')) {
                    defaultProvince = "Hà Nội";
                } else if (zipCode.startsWith('51')) {
                    defaultProvince = "Đà Nẵng";
                } else if (zipCode.startsWith('18')) {
                    defaultProvince = "Hải Phòng";
                } else if (zipCode.startsWith('59') || zipCode.startsWith('92')) {
                    defaultProvince = "Cần Thơ";
                } else if (zipCode.startsWith('84') || zipCode.startsWith('70')) {
                    defaultProvince = "Bình Dương";
                } else if (zipCode.startsWith('75')) {
                    defaultProvince = "Đồng Nai";
                }
                // Add more mappings as needed based on Vietnamese postal codes
            }
            
            shop.province = defaultProvince;
            await shop.save();
            migratedCount++;
            console.log(`Migrated shop: ${shop.email} -> Province: ${shop.province}`);
        }
        
        console.log(`Shop migration completed. ${migratedCount} shops updated.`);
        return { success: true, migratedCount };
    } catch (error) {
        console.error('Shop migration failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { migrateShopsZipCodeToProvince };
