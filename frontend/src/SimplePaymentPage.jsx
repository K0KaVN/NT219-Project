import React from 'react';

const SimplePaymentPage = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h1>Simple Payment Page</h1>
            <p>This is a simple payment page for testing.</p>
            <div style={{ backgroundColor: '#f0f0f0', padding: '20px', margin: '20px 0' }}>
                <h2>Payment Form</h2>
                <form>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Card Number:</label>
                        <input type="text" style={{ marginLeft: '10px', padding: '5px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Expiry Date:</label>
                        <input type="text" style={{ marginLeft: '10px', padding: '5px' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>CVV:</label>
                        <input type="text" style={{ marginLeft: '10px', padding: '5px' }} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px' }}>
                        Pay Now
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SimplePaymentPage;
