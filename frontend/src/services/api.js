
import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token to API requests
API.interceptors.request.use(
  (config) => {
    const isTokenRequest =
      config.url === "token/" ||
      config.url === "token/refresh/";

    if (!isTokenRequest) {
      const token = sessionStorage.getItem("access_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired access tokens
let refreshInProgress = false;
let pendingRequests = [];

const settlePending = (error, token = null) => {
  pendingRequests.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );

  pendingRequests = [];
};

// Clear authentication session
const clearAuthSession = () => {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("user_role");
  sessionStorage.removeItem("user_email");

  delete API.defaults.headers.common.Authorization;
};

API.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("token/") ||
      original.url?.includes("logout/")
    ) {
      return Promise.reject(error);
    }

    const refresh = sessionStorage.getItem("refresh_token");

    if (!refresh) {
      clearAuthSession();
      window.location.assign("/login");
      return Promise.reject(error);
    }

    // Queue requests while another request refreshes the token
    if (refreshInProgress) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((token) => {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;

        return API(original);
      });
    }

    original._retry = true;
    refreshInProgress = true;

    try {
      const response = await axios.post(
        `${API.defaults.baseURL}token/refresh/`,
        { refresh }
      );

      const newAccess = response.data.access;

      if (!newAccess) {
        throw new Error(
          "Access token missing from refresh response."
        );
      }

      const newRefresh = response.data.refresh || refresh;

      sessionStorage.setItem("access_token", newAccess);
      sessionStorage.setItem("refresh_token", newRefresh);

      API.defaults.headers.common.Authorization =
        `Bearer ${newAccess}`;

      settlePending(null, newAccess);

      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccess}`;

      return API(original);

    } catch (refreshError) {
      settlePending(refreshError);
      clearAuthSession();

      window.location.assign("/login");

      return Promise.reject(refreshError);

    } finally {
      refreshInProgress = false;
    }
  }
);

export default API;
