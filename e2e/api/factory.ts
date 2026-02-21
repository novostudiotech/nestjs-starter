import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Create an axios instance with automatic Bearer token management.
 * Tokens are extracted from 'set-auth-token' response header and
 * automatically included in subsequent requests.
 */
export const createAxiosInstance = ({
  baseURL = 'http://localhost:13000',
  ...config
}: AxiosRequestConfig = {}): AxiosInstance => {
  // Token storage for this instance
  let bearerToken: string | null = null;

  const axiosInstance = axios.create({
    baseURL,
    validateStatus: () => true,
    paramsSerializer: {
      indexes: null, // ?danceStyles=a&danceStyles=b (OpenAPI form/explode standard)
    },
    ...config,
  });

  // Add request interceptor to inject Bearer token
  axiosInstance.interceptors.request.use((requestConfig) => {
    if (bearerToken) {
      requestConfig.headers.Authorization = `Bearer ${bearerToken}`;
    }
    return requestConfig;
  });

  // Add response interceptor to extract and store token
  axiosInstance.interceptors.response.use((response) => {
    // Bearer plugin sets token in 'set-auth-token' header (axios normalizes to lowercase)
    const token = response.headers['set-auth-token'] || response.headers['Set-Auth-Token'];
    if (token && typeof token === 'string') {
      bearerToken = token;
    }
    return response;
  });

  return axiosInstance;
};
