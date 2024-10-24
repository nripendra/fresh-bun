import { cookie } from "@fresh-bun/cookies/cookie-jar";
import { registerHyperAwareness } from "@fresh-bun/routing/pages/hyper-media-helper";
import { FreshBun } from "@fresh-bun/runtime";
import { session, sessionAuthentication } from "@fresh-bun/session";

registerHyperAwareness({
  isHyperMediaAjaxRequest(ctx) {
    return (
      ctx.request.headers.has("HX-Boosted") ||
      ctx.request.headers.has("HX-Request")
    );
  },
});

const rootDir = import.meta.dir;

const server = await FreshBun.create({
  rootDir,
})
  .use(cookie())
  .use(session())
  .use(sessionAuthentication())
  .serve();

console.log(`Started server at http://localhost:${server.port}`);