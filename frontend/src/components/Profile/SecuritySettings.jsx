import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { server } from '../../server';

const SecuritySettings = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasPin, setHasPin] = useState(null); // null = loading, true/false after check
    
    // Check if the user has a PIN set
    useEffect(() => {
        const checkPinStatus = async () => {
            try {
                const response = await axios.get(
                    `${server}/user/has-payment-pin`,
                    { withCredentials: true }
                );
                setHasPin(response.data.hasPin);
            } catch (error) {
                console.error('Failed to check PIN status:', error);
                setHasPin(false); // Default to false if check fails
            }
        };
        
        checkPinStatus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (newPin !== confirmNewPin) {
            toast.error('New PIN and confirm PIN do not match!');
            setLoading(false);
            return;
        }

        if (!/^\d{6}$/.test(newPin)) {
            toast.error('PIN must be a 6-digit number.');
            setLoading(false);
            return;
        }

        // If user already has a PIN, current password is required
        if (hasPin && !currentPassword) {
            toast.error('Current password is required to update your existing PIN.');
            setLoading(false);
            return;
        }
        
        // If setting a new PIN (no PIN exists yet), password is not required

        try {
            // Always include currentPassword in the payload but it will only be required 
            // by the backend if user already has a PIN
            const payload = { 
                currentPassword, 
                newPin 
            };
            
            const response = await axios.put(
                `${server}/user/set-payment-pin`,
                payload,
                { withCredentials: true }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setCurrentPassword('');
                setNewPin('');
                setConfirmNewPin('');
                setHasPin(true); // PIN has been set
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred while updating the PIN.';
            toast.error(errorMessage);
            console.error('Error updating PIN:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full px-5 py-8 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
                {hasPin ? 'Update Payment PIN' : 'Set Payment PIN'}
            </h2>
            <p className="text-gray-600 mb-6">
                {hasPin 
                    ? 'Your payment PIN is required for confirming transactions. Enter your current password and set a new 6-digit PIN.' 
                    : 'Set a 6-digit PIN to secure your payment transactions. This PIN will be required when making payments.'}
            </p>
            
            {/* Show loading state while checking PIN status */}
            {hasPin === null ? (
                <div className="text-center py-4">Loading...</div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Password field - only show if user already has a PIN */}
                    {hasPin && (
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                Current Password
                            </label>
                            <input
                                type="password"
                                id="currentPassword"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    )}

                    {/* New PIN field */}
                    <div>
                        <label htmlFor="newPin" className="block text-sm font-medium text-gray-700">
                            {hasPin ? 'New Payment PIN (6 digits)' : 'Payment PIN (6 digits)'}
                        </label>
                    <input
                        type="password" // Use type="password" to hide the PIN
                        id="newPin"
                        value={newPin}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Allow only digits and limit to 6 characters
                            if (/^\d*$/.test(value) && value.length <= 6) {
                                setNewPin(value);
                            }
                        }}
                        required
                        maxLength="6"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                {/* Confirm New PIN field */}
                <div>
                    <label htmlFor="confirmNewPin" className="block text-sm font-medium text-gray-700">
                        Confirm New Payment PIN
                    </label>
                    <input
                        type="password"
                        id="confirmNewPin"
                        value={confirmNewPin}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value) && value.length <= 6) {
                                setConfirmNewPin(value);
                            }
                        }}
                        required
                        maxLength="6"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : hasPin ? 'Update PIN' : 'Set PIN'}
                    </button>
                </div>
            </form>
            )}
        </div>
    );
};

export default SecuritySettings;
