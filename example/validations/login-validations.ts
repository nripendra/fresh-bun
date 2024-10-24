import { ValidationRules, WellknownRules } from "@fresh-bun/lib/validation";
import { type } from "arktype";

export const loginType = type({
  username: "string>3",
  password: "string>0",
});

export const loginValidations = new ValidationRules([
  WellknownRules.emailField("username"),
  WellknownRules.minLength("username", 3),
  WellknownRules.requiredField("password"),
]);
