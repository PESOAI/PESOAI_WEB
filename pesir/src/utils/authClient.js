// pesir/src/utils/authClient.js
// Cookie-aware fetch wrapper with automatic refresh retry for protected endpoints.
const API_BASE = '';

const withDefaults = (options = {}) => {
  const mergedHeaders = { ...(options.headers || {}) };
  return {
    credentials: 'include',
    ...options,
    headers: mergedHeaders,
  };
};

const isJsonRequest = (options = {}) =>
  options.body && typeof options.body === 'string' && !options.headers?.['Content-Type'];

export const apiFetch = async (path, options = {}, retry = true) => {
  const init = withDefaults(options);
  if (isJsonRequest(init)) {
    init.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path.startsWith('http') ? path : `${API_BASE}${path}`, init);
  if (response.status !== 401 || !retry) return response;

  const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!refreshResponse.ok) return response;

  return apiFetch(path, options, false);
};
