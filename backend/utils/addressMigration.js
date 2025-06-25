const User = require('../model/user');

/**
 * Migration script to clean up old address structure and ensure consistency
 * This script will:
 * 1. Remove deprecated fields (address1, address2, zipCode, city)
 * 2. Ensure all addresses have the new structure (country, province, address, addressType)
 */
const migrateAddresses = async () => {
    try {
        console.log('Starting address migration...');
        
        const users = await User.find({});
        let migratedCount = 0;
        
        for (const user of users) {
            let hasChanges = false;
            
            if (user.addresses && user.addresses.length > 0) {
                user.addresses = user.addresses.map(addr => {
                    const newAddr = {
                        country: addr.country || "VietNam",
                        province: addr.province || addr.city || "",
                        address: addr.address || addr.address1 || "",
                        addressType: addr.addressType || "Default"
                    };
                    
                    // Check if this address needs migration
                    if (addr.address1 || addr.address2 || addr.zipCode || addr.city) {
                        hasChanges = true;
                    }
                    
                    return newAddr;
                });
                
                if (hasChanges) {
                    await user.save();
                    migratedCount++;
                    console.log(`Migrated user: ${user.email}`);
                }
            }
        }
        
        console.log(`Migration completed. ${migratedCount} users updated.`);
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

module.exports = { migrateAddresses };
