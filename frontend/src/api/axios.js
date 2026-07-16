import axios from "axios";
import toast from "react-hot-toast";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

const publicAuthPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/google/token",
  "/auth/google/config",
  "/auth/refresh-token",
  "/auth/change-password",
  "/auth/forgot-password",
  "/auth/reset-password",
];

let refreshPromise = null;
let sessionExpiredHandled = false;
let lastServiceToastAt = 0;

const isPublicAuthRequest = (url = "") =>
  publicAuthPaths.some((path) => String(url).includes(path));

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const notifySessionExpired = () => {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  clearSession();
  window.dispatchEvent(new CustomEvent("byteverse:session-expired"));
  toast.error("Tu sesión terminó. Inicia sesión nuevamente.", {
    id: "session-expired",
  });

  if (!window.location.pathname.startsWith("/login")) {
    window.setTimeout(() => {
      window.location.assign("/login?session=expired");
    }, 250);
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token && !config.skipAuth) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    const url = String(response.config?.url || "");
    if (
      (url.includes("/auth/login") || url.includes("/auth/google/token")) &&
      response.data?.accessToken
    ) {
      sessionExpiredHandled = false;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = String(originalRequest.url || "");

    if (
      status === 401 &&
      !isPublicAuthRequest(requestUrl) &&
      !originalRequest._retry
    ) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        notifySessionExpired();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(
              `${API_URL}/auth/refresh-token`,
              { refreshToken },
              {
                timeout: 15000,
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
              },
            )
            .then((response) => {
              const accessToken = response.data?.accessToken;
              if (!accessToken)
                throw new Error("El servidor no devolvió un token válido");
              localStorage.setItem("accessToken", accessToken);
              sessionExpiredHandled = false;
              return accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const accessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        notifySessionExpired();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      // Los errores de credenciales del login se muestran en el propio formulario.
      return Promise.reject(error);
    }

    if (!originalRequest.skipGlobalError && status !== 404) {
      const now = Date.now();
      if (status === 503 || !error.response) {
        if (now - lastServiceToastAt > 5000) {
          toast.error(
            status === 503
              ? "Un servicio del sistema está iniciando. Intenta nuevamente en unos segundos."
              : "No se pudo conectar con el servidor. Verifica que el backend esté encendido.",
            { id: "backend-connectivity" },
          );
          lastServiceToastAt = now;
        }
      } else {
        const message =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Error en la petición";
        toast.error(message);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
