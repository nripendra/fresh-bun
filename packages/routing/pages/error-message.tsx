import type { ValidationResult } from "@fresh-bun/lib/validation";

export const ErrorMessages = ({
  validationResult,
  field,
  className = "text-error",
}: {
  validationResult: ValidationResult | null | undefined;
  field: string;
  className?: string;
}) => {

  if (!validationResult) {
    return null;
  }
  const errors = validationResult.errorsFor(field);
  if (errors.length === 1) {
    return <div className={className}>{errors[0]}</div>;
  }
  return (
    <ul>
      {errors.map((error) => (
        <li className={className}>{error}</li>
      ))}
    </ul>
  );
};
