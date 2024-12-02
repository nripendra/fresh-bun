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
      <body>
        <div className="min-h-screen bg-gray-100">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Fresh-Bun</h1>
            </div>
          </header>
          <main>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
});
