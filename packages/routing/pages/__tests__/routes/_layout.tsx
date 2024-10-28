// @jsxImportSource preact
import { defineLayout } from "../../layout-provider";

export default defineLayout(({ children }) => {
  return (
    <html lang={"en"}>
      <head>
        <title>Hello</title>
      </head>
      <body>{children}</body>
    </html>
  );
});
