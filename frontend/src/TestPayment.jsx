import React from 'react';
import Payment from './components/Payment/Payment.jsx';

// Test component để check Payment có render được không
const TestPayment = () => {
    return (
        <div>
            <h1>Test Payment Component</h1>
            <Payment />
        </div>
    );
};

export default TestPayment;
