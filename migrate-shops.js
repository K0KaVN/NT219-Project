// Migration script to convert shop zipCode to province
const mongoose = require('mongoose');
const { migrateShopsZipCodeToProvince } = require('./backend/utils/shopMigration');

// Load environment variables if they exist
require('dotenv').config();

const runMigration = async () => {
    try {
        // Connect to MongoDB
        const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/shop";
        await mongoose.connect(DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('Connected to database for migration');
        
        // Run the migration
        await migrateShopsZipCodeToProvince();
        
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
