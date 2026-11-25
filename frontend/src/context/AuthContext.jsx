
import { createContext, useContext, useState } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => sessionStorage.getItem("access_token")
  );

  const [role, setRole] = useState(
    () => sessionStorage.getItem("user_role")
  );

  const [email, setEmail] = useState(
    () => sessionStorage.getItem("user_email")
  );

  const login = async (email, password) => {
    try {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      sessionStorage.removeItem("user_role");
      sessionStorage.removeItem("user_email");

      const response = await API.post("token/", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { access, refresh, role, email: userEmail } = response.data;

      if (!access || !refresh || !role) {
        throw new Error("Login response is missing token or role.");
      }

      sessionStorage.setItem("access_token", access);
      sessionStorage.setItem("refresh_token", refresh);
      sessionStorage.setItem("user_role", role);
      sessionStorage.setItem("user_email", userEmail);

      setAccessToken(access);
      setRole(role);
      setEmail(userEmail);

      return response.data;
    } catch (error) {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      sessionStorage.removeItem("user_role");
      sessionStorage.removeItem("user_email");

      setAccessToken(null);
      setRole(null);
      setEmail(null);

      throw error;
    }
  };

  const logout = async () => {
    const refresh = sessionStorage.getItem("refresh_token");
    try {
      if (refresh) await API.post("logout/", { refresh });
    } catch (error) {
      // Always clear this browser session, even if the server token is expired.
    }
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_role");
    sessionStorage.removeItem("user_email");

    setAccessToken(null);
    setRole(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        role,
        email,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
