import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { server } from "../server";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get(`${server}/user/getuser`, { withCredentials: true });
      if (res.data.success) {
        setIsAuthenticated(true);
        setUser(res.data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setIsLoading(false);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      setIsAuthenticated, 
      user, 
      setUser, 
      isLoading, 
      setIsLoading,
      checkAuthStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};