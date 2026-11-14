export class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

const RETRYABLE_STATUS_CODES = new Set([
  408,
  429,
  500,
  502,
  503,
  504
]);

const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET"
]);

interface ErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  isRetryable?: unknown;
  cause?: unknown;
}

const getErrorDetails = (error: unknown): {
  statusCode?: number;
  retryable: boolean;
  message: string;
} => {
  const details = error as ErrorLike;

  const statusCode =
    typeof details?.status === "number"
      ? details.status
      : typeof details?.statusCode === "number"
        ? details.statusCode
        : undefined;

  const message =
    error instanceof Error
      ? error.message
      : "Unknown provider error";

  if (statusCode !== undefined) {
    return {
      statusCode,
      retryable: RETRYABLE_STATUS_CODES.has(statusCode)
        || statusCode >= 500,
      message
    };
  }

  if (details?.isRetryable === true) {
    return {
      retryable: true,
      message
    };
  }

  const cause = details?.cause as ErrorLike | undefined;

  if (
    typeof cause?.code === "string" &&
    NETWORK_ERROR_CODES.has(cause.code)
  ) {
    return {
      retryable: true,
      message
    };
  }

  return {
    retryable: false,
    message
  };
};

export const toProviderRequestError = (
  error: unknown,
  provider: string
): ProviderRequestError => {

  if (error instanceof ProviderRequestError) {
    return error;
  }

  const details = getErrorDetails(error);

  return new ProviderRequestError(
    details.message,
    provider,
    details.retryable,
    details.statusCode
  );
};