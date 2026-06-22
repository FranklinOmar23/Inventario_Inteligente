import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry GET requests on network errors (ECONNRESET, ECONNREFUSED, etc.)
const MAX_RETRIES    = 2;
const SAFE_METHODS   = ['get', 'head', 'options'];
const RETRY_DELAY_MS = 1200;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const config      = err.config;
    const isNetErr    = !err.response;                                        // no HTTP response = network failure
    const isSafe      = SAFE_METHODS.includes(config?.method?.toLowerCase()); // only safe/idempotent verbs
    const retries     = config?._retryCount ?? 0;

    if (isNetErr && isSafe && retries < MAX_RETRIES && config) {
      config._retryCount = retries + 1;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * config._retryCount));
      return api(config);
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(err);
  }
);

export default api;
