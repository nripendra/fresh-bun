export type Success = "SUCCESS";
export type Err = { message: string };

export interface ValidationResultItem<T> {
  field: string;
  value: T;
  error?: Err | Success;
  toJSON?(): { field: string; value: T; error?: Err | Success };
}

type ValidationRuleChecker<T> = {
  field: string;
  message: string;
  check(obj: FormData | Record<string, unknown>): Promise<"SUCCESS" | Err>;
};

export class ValidationRules {
  constructor(private rules: ValidationRuleChecker<unknown>[]) {}
  async check(
    obj: FormData | Record<string, unknown>,
  ): Promise<ValidationResult> {
    const result = new ValidationResult();
    for (const rule of this.rules) {
      const error: Err | Success = await rule.check(obj);
      const field = rule.field;
      const value =
        obj instanceof FormData ? obj.get(rule.field) : obj[rule.field];
      result.push({
        field,
        value,
        error,
        toJSON() {
          return {
            field,
            value,
            error: error === "SUCCESS" ? error : { message: error.message },
          };
        },
      });
    }
    return result;
  }
}

export const WellknownRules = {
  requiredField(field: string, message = `${field} is required`) {
    return {
      field,
      message,
      async check(obj: FormData | Record<string, unknown>) {
        if (obj instanceof FormData) {
          if (obj.get(field)) return "SUCCESS";
        } else if (obj[field]) {
          return "SUCCESS";
        }
        return new Error(message);
      },
    } satisfies ValidationRuleChecker<string>;
  },

  emailField(field: string, message = `${field} should be valid email`) {
    return {
      field,
      message,
      async check(obj: FormData | Record<string, unknown>) {
        const value =
          obj instanceof FormData
            ? (obj.get(field) as string)
            : (obj[field] as string);
        if (!value) {
          return "SUCCESS";
        }
        if (value && /.*@.*\.\w+/.test(value)) {
          return "SUCCESS";
        }
        return new Error(message);
      },
    } satisfies ValidationRuleChecker<string>;
  },
  minLength(
    field: string,
    minLength: number,
    message = `${field} must be at least length ${minLength}`,
  ) {
    return {
      field,
      message,
      async check(obj: FormData | Record<string, unknown>) {
        const value =
          obj instanceof FormData
            ? (obj.get(field) as string)
            : (obj[field] as string);
        if (!value) {
          return "SUCCESS";
        }
        if (value.length >= minLength) {
          return "SUCCESS";
        }
        return new Error(message);
      },
    } satisfies ValidationRuleChecker<string>;
  },

  match(
    field: string,
    targetField: string,
    message = `${field} and ${targetField} should match`,
  ) {
    return {
      field,
      message,
      async check(obj: FormData | Record<string, unknown>) {
        const value1 = obj instanceof FormData ? obj.get(field) : obj[field];
        const value2 =
          obj instanceof FormData ? obj.get(targetField) : obj[targetField];
        if (value1 !== value2) {
          return new Error(message);
        }
        return "SUCCESS";
      },
    } satisfies ValidationRuleChecker<FormData>;
  },
};

export class ValidationResult {
  getValue<T>(field: string): T | undefined {
    return this.validations.find((x) => x.field === field)?.value as T;
  }
  __type = "ValidationResult" as const;
  readonly validations = [] as ValidationResultItem<unknown>[];
  constructor(validations: ValidationResultItem<unknown>[] = []) {
    this.validations = validations;
  }

  get isValid() {
    for (const validation of this.validations) {
      if (validation.error !== "SUCCESS") {
        return false;
      }
    }
    return true;
  }

  get hasErrors() {
    for (const validation of this.validations) {
      if (validation.error !== "SUCCESS") {
        return true;
      }
    }
    return false;
  }

  errorsFor(field: string) {
    return this.validations
      .filter((rule) => rule.field === field && rule.error !== "SUCCESS")
      .map((rule) => (rule.error as Error).message);
  }

  push<T>(result: ValidationResultItem<T>) {
    this.validations.push(result);
  }

  toJSON() {
    return {
      __type: "ValidationResult",
      isValid: this.isValid,
      hasErrors: this.hasErrors,
      validations: [...this.validations],
    };
  }

  // @ts-expect-error
  static isValidationResult<T>(obj: T): obj is ValidationResult {
    if (obj instanceof ValidationResult) {
      return true;
    }
    if (
      obj &&
      typeof obj === "object" &&
      "__type" in obj &&
      obj.__type === "ValidationResult" &&
      "isValid" in obj &&
      "hasErrors" in obj
    ) {
      return true;
    }
    return false;
  }
}
