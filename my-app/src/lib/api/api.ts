import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Queue for requests that come in while a refresh is already in flight
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  // Fix 1: guard localStorage access — safe on both server and client
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["x-client-type"] = "web";

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent refresh loop — if the refresh route itself 401s, bail immediately
    if (originalRequest.url?.includes("auth/refresh")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        window.location.replace("/login");
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Fix 2: window.location.origin is correct here — this hits the Next.js
        // proxy route at /api/auth/refresh which reads the httpOnly cookie.
        // Using BASE_URL would bypass the proxy and lose the cookie.
        const { data } = await axios.post(
          `${window.location.origin}/api/auth/refresh`,
          {},
          { withCredentials: true }  // ← add this
        );
        const newAccessToken = data.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          window.location.replace("/login");
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;