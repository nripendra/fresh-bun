export enum LogLevel {
  DEBUG = 0,
  INFO,
  WARN,
  ERROR,
  FATAL,
}

export interface Logger {
  log(message?: any, ...optionalParams: any[]): void;
  debug(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
}

export interface Span {
  do<T>(fn: (span: Logger) => T): T;
}

export namespace Logger {
  const DefaultLogger: Logger = console;

  export let logLevel = LogLevel.DEBUG;
  export let logExporter = DefaultLogger;
  let spanDepth = 0;
  class SpanScope implements Span {
    constructor(public readonly title: string, public readonly depth: number) {}
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
    log(message?: any, ...optionalParams: any[]): void {
      let indent = "  ".repeat(this.depth);
      logExporter.log(indent + this.title + ": " + message, ...optionalParams);
    }
    debug(message?: any, ...optionalParams: any[]): void {
      if (logLevel == LogLevel.DEBUG) {
        let indent = "  ".repeat(this.depth);
        logExporter.debug(
          indent + this.title + ": " + message,
          ...optionalParams
        );
      }
    }
    error(message?: any, ...optionalParams: any[]): void {
      let indent = "  ".repeat(this.depth);
      logExporter.error(
        indent + this.title + ": " + message,
        ...optionalParams
      );
    }
  }
  export function startSpan(title: string): Span {
    return new SpanScope(title, spanDepth++);
  }
}
