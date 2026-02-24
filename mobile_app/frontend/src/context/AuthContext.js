import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  const login = (userData) => {
    // userData may include a token field
    const tokenVal = userData.token || userData.id;
    const userObj = { ...userData };
    if (userObj.token) delete userObj.token;
    setUser(userObj);
    setToken(tokenVal);
    localStorage.setItem("user", JSON.stringify(userObj));
    localStorage.setItem("token", tokenVal);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const isAuthenticated = () => !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
