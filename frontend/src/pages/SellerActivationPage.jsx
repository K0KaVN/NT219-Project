import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom';
import { server } from "../server";
import axios from 'axios';


const SellerActivationPage = () => {
    const { activation_token } = useParams();
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (activation_token) {
            const activationEmail = async () => {
                try {
                    const res = await axios
                        .post(`${server}/shop/activation`, {
                            activation_token
                        })
                    setIsLoading(false);
                } catch (err) {
                    console.log(err.response?.data?.message);
                    setError(true);
                    setErrorMessage(err.response?.data?.message || 'Activation failed');
                    setIsLoading(false);
                }
            }
            activationEmail();
        }
    }, [activation_token]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <div className="text-center">
                        {isLoading ? (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                                    <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">
                                    Activating your shop account...
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    Please wait while we verify your activation token.
                                </p>
                            </>
                        ) : error ? (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </div>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">
                                    Activation Failed
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    {errorMessage.includes('expired') || errorMessage.includes('Invalid token') 
                                        ? 'Your activation link has expired or is invalid. Please try registering again.'
                                        : errorMessage || 'Something went wrong during activation.'
                                    }
                                </p>
                                <div className="mt-6">
                                    <Link 
                                        to="/shop-create" 
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Try Again
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                                <h3 className="mt-4 text-lg font-medium text-gray-900">
                                    Shop Account Activated Successfully!
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    Congratulations! Your shop account has been activated. You can now log in and start setting up your store.
                                </p>
                                <div className="mt-6">
                                    <Link 
                                        to="/shop-login" 
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Login to Your Shop
                                    </Link>
                                </div>
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500">
                                        Ready to start selling? Set up your products and start your business journey!
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SellerActivationPage
