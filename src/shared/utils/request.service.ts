import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

export interface RequestConfig extends AxiosRequestConfig {
  retry?: RetryConfig;
  headers?: Record<string, string>;
}

export interface RetryConfig {
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

export interface RequestError {
  message: string;
  status?: number;
  statusText?: string;
  data?: unknown;
  code?: string;
  isRetryable: boolean;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  enabled: false,
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED"],
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Robust HTTP request service built on axios with retry mechanism and error handling.
 *
 * @example
 * ```ts
 * // Basic usage
 * const service = new RequestService("https://api.example.com");
 * const data = await service.get("/users");
 *
 * // With retry enabled
 * const data = await service.get("/users", {
 *   retry: {
 *     enabled: true,
 *     maxRetries: 3,
 *     retryDelay: 1000,
 *   },
 * });
 *
 * // With custom headers
 * const data = await service.post("/users", { name: "John" }, {
 *   headers: { Authorization: "Bearer token" },
 * });
 *
 * // All HTTP methods supported
 * await service.get("/users");
 * await service.post("/users", { name: "John" });
 * await service.put("/users/1", { name: "Jane" });
 * await service.patch("/users/1", { name: "Jane" });
 * await service.delete("/users/1");
 * ```
 */
export class RequestService {
  private axiosInstance: AxiosInstance;

  constructor(baseURL?: string, defaultHeaders?: Record<string, string>) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
        ...defaultHeaders,
      },
    });

    // Request interceptor for logging/debugging (optional)
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Performs a GET request
   */
  async get<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  /**
   * Performs a POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  /**
   * Performs a PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  /**
   * Performs a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
  }

  /**
   * Performs a DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * Core request method with retry logic
   */
  private async request<T = unknown>(
    config: RequestConfig & { method: string; url: string }
  ): Promise<T> {
    const retryConfig = this.mergeRetryConfig(config.retry);

    // Merge headers properly - extract common headers and merge with config headers
    const defaultCommonHeaders =
      this.axiosInstance.defaults.headers.common || {};
    const mergedHeaders = {
      ...defaultCommonHeaders,
      ...(config.headers || {}),
    };

    const requestConfig: AxiosRequestConfig = {
      ...config,
      headers: mergedHeaders as Record<string, string>,
    };

    // Remove retry config from axios config
    delete (requestConfig as RequestConfig).retry;

    if (!retryConfig.enabled) {
      return this.executeRequest<T>(requestConfig);
    }

    // Execute with retry logic
    return this.executeWithRetry<T>(requestConfig, retryConfig);
  }

  /**
   * Executes a single request
   */
  private async executeRequest<T = unknown>(
    config: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Executes request with retry logic and exponential backoff
   */
  private async executeWithRetry<T = unknown>(
    config: AxiosRequestConfig,
    retryConfig: Required<RetryConfig>,
    attempt = 1
  ): Promise<T> {
    try {
      return await this.executeRequest<T>(config);
    } catch (error) {
      const requestError = this.handleError(error);

      // Check if we should retry
      if (
        attempt <= retryConfig.maxRetries &&
        requestError.isRetryable
      ) {
        const delay = this.calculateBackoffDelay(
          attempt,
          retryConfig.retryDelay
        );

        await this.sleep(delay);

        return this.executeWithRetry<T>(config, retryConfig, attempt + 1);
      }

      // Max retries reached or error is not retryable
      throw requestError;
    }
  }

  /**
   * Handles and normalizes errors
   */
  private handleError(error: unknown): RequestError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText;
      const data = axiosError.response?.data;
      const code = axiosError.code;

      const isRetryable = this.isRetryableError(
        status,
        code,
        axiosError.response?.status
      );

      return {
        message:
          (data as { message?: string })?.message ||
          axiosError.message ||
          "Request failed",
        status,
        statusText,
        data,
        code,
        isRetryable,
      };
    }

    // Handle non-axios errors
    if (error instanceof Error) {
      return {
        message: error.message,
        isRetryable: false,
      };
    }

    return {
      message: "Unknown error occurred",
      isRetryable: false,
    };
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(
    status?: number,
    code?: string,
    responseStatus?: number
  ): boolean {
    const retryConfig = DEFAULT_RETRY_CONFIG;

    // Check status code
    if (status && retryConfig.retryableStatusCodes.includes(status)) {
      return true;
    }

    // Check response status
    if (
      responseStatus &&
      retryConfig.retryableStatusCodes.includes(responseStatus)
    ) {
      return true;
    }

    // Check error code
    if (code && retryConfig.retryableErrors.includes(code)) {
      return true;
    }

    return false;
  }

  /**
   * Calculates exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff: baseDelay * 2^(attempt - 1)
    // Add jitter to prevent thundering herd
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Merges retry config with defaults
   */
  private mergeRetryConfig(
    retry?: RetryConfig
  ): Required<RetryConfig> {
    if (!retry) {
      return DEFAULT_RETRY_CONFIG;
    }

    return {
      enabled: retry.enabled ?? DEFAULT_RETRY_CONFIG.enabled,
      maxRetries: retry.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      retryDelay: retry.retryDelay ?? DEFAULT_RETRY_CONFIG.retryDelay,
      retryableStatusCodes:
        retry.retryableStatusCodes ?? DEFAULT_RETRY_CONFIG.retryableStatusCodes,
      retryableErrors:
        retry.retryableErrors ?? DEFAULT_RETRY_CONFIG.retryableErrors,
    };
  }

  /**
   * Updates default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.axiosInstance.defaults.headers, headers);
  }

  /**
   * Updates the base URL
   */
  setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Updates the default timeout
   */
  setTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }
}

