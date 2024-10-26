import { ValidationResult } from "@fresh-bun/lib/validation";
import { defineHandler } from "@fresh-bun/routing/core";
import { definePage } from "@fresh-bun/routing/pages";
import { ErrorMessages } from "@fresh-bun/routing/pages/error-message";
import { isHyperMediaAjaxRequest } from "@fresh-bun/routing/pages/hyper-media-helper";
import LayoutProvider from "@fresh-bun/routing/pages/layout-provider";
import { setFlash } from "@fresh-bun/session";

type LoginResponse = ValidationResult | { success: true };

export const POST = defineHandler(async (ctx) => {
  const formData = await ctx.request.formData();
  // const result = await loginValidations.check(formData);
  // if (result.hasErrors) {
  //   console.log("Early return");
  //   return result;
  // }
  const response = await ctx.fetchJson<LoginResponse>("/api/login-post", {
    method: "POST",
    body: JSON.stringify({
      username: formData.get("username"),
      password: formData.get("password"),
    }),
  });

  setFlash(ctx, { type: "success", content: "User logged in successfully" });

  if (!ValidationResult.isValidationResult(response.data)) {
    if (isHyperMediaAjaxRequest(ctx)) {
      return new Response("", {
        status: 303,
        headers: {
          "HX-REDIRECT": "/",
        },
      });
    }
    return Response.redirect("/", 303);
  }
  return response.data;
});

export default definePage<LoginResponse | undefined>(({ ctx, data }) => {
  let errors: ValidationResult | null = null;
  data = data || { success: true };
  if (data instanceof ValidationResult) {
    errors = data;
  }
  return (
    <LayoutProvider ctx={ctx}>
      <div className={"flex h-full min-h-full"}>
        <form
          method={"post"}
          className={"m-auto w-full sm:w-[25rem]"}
          hx-boost="true"
          hx-target="#main"
          hx-swap="innerHTML"
          hx-ext="disable-element"
          hx-disable-element=".btn"
        >
          <div className="card bg-base-100 w-full shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Login</h2>
              <div className={"m-5 mb-0"}>
                <ErrorMessages
                  validationResult={errors}
                  field="*"
                  className="text-error text-sm"
                />
              </div>
              <div className="form-control m-5 mb-0 relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                  value={errors?.getValue("username")}
                  className="input input-bordered placeholder-transparent peer"
                />
                <label
                  htmlFor="username"
                  className="label absolute left-3 pointer-events-none transition-all text-base-content text-opacity-50 -top-4 peer-placeholder-shown:top-1.5 text-xs peer-placeholder-shown:text-sm bg-base-100 peer-placeholder-shown:bg-transparent"
                >
                  Username
                </label>
                <ErrorMessages
                  validationResult={errors}
                  field="username"
                  className="text-error text-sm"
                />
              </div>
              <div className="form-control m-5 mt-5 mb-0 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={errors?.getValue("password")}
                  className="input input-bordered placeholder-transparent peer"
                />
                <label
                  htmlFor="password"
                  className="label absolute left-3 pointer-events-none transition-all text-base-content text-opacity-50 -top-4 peer-placeholder-shown:top-1.5 text-xs peer-placeholder-shown:text-sm bg-base-100 peer-placeholder-shown:bg-transparent"
                >
                  Password
                </label>
                <ErrorMessages validationResult={errors} field="password" />
              </div>

              <div className="card-actions justify-end mt-5 mr-5">
                <button type="submit" className="btn btn-primary">
                  <span
                    hx-indicator
                    className="loading loading-spinner loading-sm htmx-indicator"
                  />
                  Login
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </LayoutProvider>
  );
});
