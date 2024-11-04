/**
 * SafeHttpError here means the message of these errors should not contain anything that shouldn't be revealed to end-user.
 * Don't use any derived class of SafeHttpError if the message may contain some details that shouldn't be revealed to end-user.
 */
export class SafeHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly data?: unknown,
  ) {
    super();
  }
}

export class SafeHttpInternalServerError extends SafeHttpError {
  constructor(
    readonly message: string,
    readonly data?: unknown,
    public readonly cause?: unknown,
  ) {
    super(500, message, data);
  }
}
export class SafeHttpNotFoundError extends SafeHttpError {
  constructor(
    readonly message: string,
    readonly data?: unknown,
  ) {
    super(404, message, data);
  }
}
export class SafeHttpMethodNotAllowedError extends SafeHttpError {
  constructor(
    readonly message: string,
    readonly data?: unknown,
  ) {
    super(405, message, data);
  }
}
export class SafeHttpUnSupportedMediaTypeError extends SafeHttpError {
  constructor(
    readonly message: string,
    readonly data?: unknown,
  ) {
    super(415, message, data);
  }
}
