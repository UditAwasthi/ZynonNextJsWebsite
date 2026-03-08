import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Required to send the refreshToken cookie
});

// Request Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Optional: match your controller's x-client-type check
  config.headers["x-client-type"] = "web"; 
  return config;
});

// Response Interceptor (The "Silent Refresh" Logic)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // This hits your router.post("/refresh", refreshTokenController)
        const { data } = await axios.post(
          `${BASE_URL}refresh`, 
          {}, 
          { withCredentials: true }
        );

        const newAccessToken = data.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        // Only redirect if we are in the browser
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;