const mongoose = require("mongoose");
const User = require("./model/user");
require('dotenv').config({
    path: "config/.env",
});

// Connect to database
const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Database connected successfully");
    } catch (error) {
        console.log("Database connection failed:", error);
        process.exit(1);
    }
};

// Migration function
const migrateAvatars = async () => {
    try {
        console.log("Starting avatar migration...");
        
        // Find all users with the old avatar format
        const usersWithOldAvatars = await User.find({
            avatar: "DefaultAvatar.jpeg"
        });
        
        console.log(`Found ${usersWithOldAvatars.length} users with old avatar format`);
        
        if (usersWithOldAvatars.length > 0) {
            // Update all users with old avatar format to new format
            const result = await User.updateMany(
                { avatar: "DefaultAvatar.jpeg" },
                { $set: { avatar: "/uploads/DefaultAvatar.jpeg" } }
            );
            
            console.log(`Successfully updated ${result.modifiedCount} users`);
        } else {
            console.log("No users found with old avatar format");
        }
        
        // Also check for any other avatars that don't start with /uploads/
        const usersWithoutUploadsPrefix = await User.find({
            avatar: { $regex: /^(?!\/uploads\/).*\.(jpg|jpeg|png|gif)$/i }
        });
        
        console.log(`Found ${usersWithoutUploadsPrefix.length} users with avatar paths missing /uploads/ prefix`);
        
        for (const user of usersWithoutUploadsPrefix) {
            if (!user.avatar.startsWith("/uploads/")) {
                // Add /uploads/ prefix to existing avatar paths
                user.avatar = `/uploads/${user.avatar}`;
                await user.save();
                console.log(`Updated user ${user.email} avatar from ${user.avatar.replace("/uploads/", "")} to ${user.avatar}`);
            }
        }
        
        console.log("Avatar migration completed successfully!");
        
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log("Database connection closed");
    }
};

// Run migration
const runMigration = async () => {
    await connectDatabase();
    await migrateAvatars();
    process.exit(0);
};

runMigration();
