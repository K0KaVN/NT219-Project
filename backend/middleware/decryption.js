const { decryptUserData, decryptShopData, decryptOrderData, decryptWithdrawData } = require('../utils/encryption');

// Middleware để tự động giải mã dữ liệu cho các response
const decryptionMiddleware = (modelType) => {
    return (req, res, next) => {
        const originalJson = res.json;
        
        res.json = function(data) {
            if (data && data.success && data[modelType]) {
                // Handle single object
                if (!Array.isArray(data[modelType])) {
                    switch (modelType) {
                        case 'user':
                            data[modelType] = decryptUserData(data[modelType]);
                            break;
                        case 'shop':
                            data[modelType] = decryptShopData(data[modelType]);
                            break;
                        case 'order':
                            data[modelType] = decryptOrderData(data[modelType]);
                            break;
                        case 'withdraw':
                            data[modelType] = decryptWithdrawData(data[modelType]);
                            break;
                    }
                }
                // Handle array of objects
                else {
                    data[modelType] = data[modelType].map(item => {
                        switch (modelType) {
                            case 'users':
                                return decryptUserData(item);
                            case 'shops':
                                return decryptShopData(item);
                            case 'orders':
                                return decryptOrderData(item);
                            case 'withdraws':
                                return decryptWithdrawData(item);
                            default:
                                return item;
                        }
                    });
                }
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
};

module.exports = decryptionMiddleware;
