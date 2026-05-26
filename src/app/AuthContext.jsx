// src/app/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { validateSession, logout as doLogout } from "../lib/authHelper.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setLoading(true);
    const validUser = await validateSession();
    setUser(validUser);
    setLoading(false);
  }

  async function handleLogout() {
    await doLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser, // lo expongo para que Login lo use después de login exitoso
        logout: handleLogout,
        refresh: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}