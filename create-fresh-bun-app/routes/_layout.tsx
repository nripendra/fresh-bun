import {
  createScript,
  createStyle,
} from "@fresh-bun/routing/pages/client-helper";
import { defineLayout } from "@fresh-bun/routing/pages/layout-provider";

const Style = createStyle(import.meta.resolve("../styles/style.css"));
const Script = createScript(import.meta.resolve("../client/index"));

export default defineLayout(({ ctx, head, children }) => {
  return (
    <html lang={"en"} data-theme="light">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {head}
        <title>My Title</title>
        <Style />
        <Script />
        <link href={"/favicon.ico"} rel={"icon"} type={"image/ico"} />
      </head>
      <body className={"flex flex-col"}>
        <header className={"flex-none h-24"}>Header</header>
        <main id="main" className={"m-5 mt-3 grow"}>
          {children}
        </main>

        <footer className="footer footer-center bg-base-300 text-base-content p-4">
          <aside>
            <p>Footer</p>
          </aside>
        </footer>
      </body>
    </html>
  );
});
