import {
  Principal,
  WellKnownClaims,
  WellknownAuthType,
} from "@fresh-bun/lib/authentication";
import {
  ValidationResult,
  type ValidationResultItem,
} from "@fresh-bun/lib/validation";
import { defineHandler } from "@fresh-bun/routing/core";
import { type } from "arktype";
import {
  loginType,
  loginValidations,
} from "../../validations/login-validations";

export const POST = defineHandler(async (ctx) => {
  const input = await ctx.request.clone().json();
  const loginData = loginType(input);
  if (loginData instanceof type.errors) {
    const result = new ValidationResult(
      loginData.map((it) => ({
        field: it.path[0] as string,
        value: it.data,
        error: { message: it.message },
      })) as ValidationResultItem<string>[],
    );
    for (const prop of Object.keys(input)) {
      if (loginData.byPath[prop] === undefined) {
        result.validations.push({
          field: prop,
          value: input[prop],
          error: "SUCCESS",
        });
      }
    }

    return Response.json(result);
  }

  if (loginData.password === "password1") {
    ctx.authentication.authenticate(
      new Principal(loginData.username, {
        [WellKnownClaims.AuthType]: WellknownAuthType.CREDENTIALS,
        [WellKnownClaims.Username]: loginData.username,
      }),
    );

    return Response.json({ success: true });
  }

  return Response.json(
    new ValidationResult([
      {
        field: "*",
        value: "",
        error: { message: "Invalid username or password" },
      },
    ]),
  );

  // const result = await loginValidations.check(input);
  // if (result.isValid) {
  //   return Response.json({ success: true });
  // }
  // return Response.json(result);
});
