import React from 'react'
import CheckoutSteps from '../components/Checkout/CheckoutSteps'
import Footer from '../components/Layout/Footer'
import Header from '../components/Layout/Header'
import Payment from "../components/Payment/Payment.jsx";

const PaymentPage = () => {
    console.log('PaymentPage is rendering...');
    
    return (
        <div className='w-full min-h-screen bg-[#f6f9fc]'>
            <Header />
            <br />
            <br />
            <CheckoutSteps active={2} />
            <div style={{ padding: '20px' }}>
                <h1>Payment Page Debug</h1>
                <p>PaymentPage with Header and CheckoutSteps is loading successfully</p>
            </div>
            {/* Temporarily comment out other components
            <Payment />
            <br />
            <br />
            <Footer /> */}
        </div>
    )
}

export default PaymentPage