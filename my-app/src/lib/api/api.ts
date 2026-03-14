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

// Safe localStorage helpers — Edge Tracking Prevention throws SecurityError
const getToken = (): string | null => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  } catch { return null; }
};
const setToken = (t: string) => {
  try { localStorage.setItem("accessToken", t); } catch { }
};
const clearToken = () => {
  try { localStorage.removeItem("accessToken"); } catch { }
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-client-type"] = "web";
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Never retry the refresh call itself — bail straight to login
    if (originalRequest._isRefreshCall) {
      clearToken();
      if (typeof window !== "undefined") window.location.replace("/login");
      return Promise.reject(error);
    }

    // Only handle 401s, and only once per request (_retry flag)
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // If a refresh is already in flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      // Hit the Next.js proxy route — it reads the httpOnly refresh cookie.
      // Mark with _isRefreshCall so a 401 on this call bails immediately above.
      const refreshConfig = {
        withCredentials: true,
        _isRefreshCall: true,  // custom flag — interceptor checks this
      } as any;

      const { data } = await axios.post(
        `${window.location.origin}/api/auth/refresh`,
        {},
        refreshConfig,
      );

      const newToken: string = data.data.accessToken;
      setToken(newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      // Resolve all queued requests with the new token
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);

    } catch (refreshError) {
      // Refresh failed — flush queue with error, clear session, go to login
      processQueue(refreshError, null);
      clearToken();
      if (typeof window !== "undefined") window.location.replace("/login");
      return Promise.reject(refreshError);

    } finally {
      // Reset only after everything above is fully settled.
      // We use a microtask so the flag stays true until the retry is dispatched.
      Promise.resolve().then(() => { isRefreshing = false; });
    }
  }
);

export default api;