export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface Logger {
  log(message?: string, ...optionalParams: unknown[]): void;
  debug(message?: string, ...optionalParams: unknown[]): void;
  error(message?: string, ...optionalParams: unknown[]): void;
}

export interface Span {
  do<T>(fn: (span: Logger) => T): T;
}

export namespace Logger {
  const DefaultLogger: Logger = console;

  let _logLevel = LogLevel.DEBUG;
  let _logExporter = DefaultLogger;
  export function setLogLevel(logLevel: LogLevel) {
    _logLevel = logLevel;
  }
  export function getLogLevel() {
    return _logLevel;
  }
  export function setLogExporter(logExporter: Logger) {
    _logExporter = logExporter;
  }
  export function getLogExporter() {
    return _logExporter;
  }
  let spanDepth = 0;
  class SpanScope implements Span {
    constructor(
      public readonly title: string,
      public readonly depth: number,
    ) {}
    endSpan(): void {
      spanDepth--;
    }

    do<T>(fn: (span: Logger) => T): T {
      let isPromise = false;
      try {
        const result = fn(this);
        isPromise = result instanceof Promise;
        if (isPromise) {
          // @ts-ignore
          return result.finally(() => {
            this.endSpan();
          });
        }
        return result;
      } finally {
        if (!isPromise) {
          this.endSpan();
        }
      }
    }
    log(message?: string, ...optionalParams: unknown[]): void {
      const indent = "  ".repeat(this.depth);
      _logExporter.log(`${indent}${this.title}:${message}`, ...optionalParams);
    }
    debug(message?: string, ...optionalParams: unknown[]): void {
      if (_logLevel === LogLevel.DEBUG) {
        const indent = "  ".repeat(this.depth);
        _logExporter.debug(
          `${indent}${this.title}:${message}`,
          ...optionalParams,
        );
      }
    }
    error(message?: string, ...optionalParams: unknown[]): void {
      const indent = "  ".repeat(this.depth);
      _logExporter.error(
        `${indent}${this.title}:${message}`,
        ...optionalParams,
      );
    }
  }
  export function startSpan(title: string): Span {
    return new SpanScope(title, spanDepth++);
  }
}
