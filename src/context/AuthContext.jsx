import { createContext, useContext, useState, useEffect } from "react";
import { getToken, getStoredUser, saveAuth, clearAuth } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Session expired");
        return r.json();
      })
      .then((u) => setUser(u))
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    setError(null);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      setError(err.detail || "Login failed");
      throw new Error(err.detail || "Login failed");
    }

    const data = await res.json();
    saveAuth(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password, fullName) => {
    setError(null);
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        full_name: fullName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      setError(err.detail || "Registration failed");
      throw new Error(err.detail || "Registration failed");
    }

    const data = await res.json();
    saveAuth(data.access_token, data.user);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}