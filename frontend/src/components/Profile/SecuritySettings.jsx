import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; // Assuming you are using react-toastify for notifications

const SecuritySettings = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [loading, setLoading] = useState(false);

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

        try {
            const response = await axios.put(
                '/api/v2/user/set-payment-pin', // Endpoint to set/update PIN
                { currentPassword, newPin },
                { withCredentials: true } // Ensure cookies are sent for authentication
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setCurrentPassword('');
                setNewPin('');
                setConfirmNewPin('');
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment PIN Settings</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Password field for verification */}
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

                {/* New PIN field */}
                <div>
                    <label htmlFor="newPin" className="block text-sm font-medium text-gray-700">
                        New Payment PIN (6 digits)
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
                        {loading ? 'Updating...' : 'Update PIN'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SecuritySettings;
