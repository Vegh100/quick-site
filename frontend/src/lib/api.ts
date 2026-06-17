import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Clear auth state and redirect to welcome
      window.dispatchEvent(new CustomEvent("auth:logout"));
    } else if (status === 429) {
      console.warn("Rate limited — please slow down.");
    }

    return Promise.reject(error);
  },
);

export default api;
