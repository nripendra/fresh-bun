import {
  AnonymousPrincipal,
  WellKnownClaims,
} from "@fresh-bun/lib/authentication";
import {
  createScript,
  createStyle,
} from "@fresh-bun/routing/pages/client-helper";
// import css from "../style.css";
import { defineLayout } from "@fresh-bun/routing/pages/layout-provider";
import { Navbar } from "../components/navbar";

const Style = createStyle(import.meta.resolve("../styles/style.css"));
const Script = createScript(import.meta.resolve("../client/index"));

export default defineLayout(({ ctx, head, children }) => {
  const isLoggedIn = !(
    ctx.authentication.principal instanceof AnonymousPrincipal
  );
  const loginName = ctx.authentication.principal.getClaim<string>(
    WellKnownClaims.Username,
  );
  return (
    <html lang={"en"} data-theme="light">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {head}
        <title>My Title1</title>
        <Style />
        <Script />
        <link href={"/favicon.ico"} rel={"icon"} type={"image/ico"} />
        <link rel="prefetch" href="/" as={"document"} />
        <link rel="prefetch" href="/login" as={"document"} />
        <script src="https://unpkg.com/htmx.org@1.9.5" />
        <script src="https://unpkg.com/htmx-ext-disable-element@2.0.0/disable-element.js" />
      </head>
      <body className={"flex flex-col"}>
        <header className={"flex-none h-24"}>
          <Navbar isLoggedIn={isLoggedIn} loginName={loginName} />
        </header>
        <main id="main" className={"m-5 mt-3 grow"}>
          {children}
        </main>

        <footer className="footer footer-center bg-base-300 text-base-content p-4">
          <aside>
            <p>
              Copyright © {new Date().getFullYear()} - All right reserved by
              ACME Industries Ltd
            </p>
          </aside>
        </footer>
      </body>
    </html>
  );
});
