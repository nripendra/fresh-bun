# fresh-bun

Full stack web framework for bun, inspired by Deno's Fresh, nuxt, dotnet and so much more.

Write a server rendered MPA apps with file based routing, jsx for templating with support
for interactive islands. Integrates well with hypermedia frameworks like HTMX. Assumes that 
tailwindcss is being used, but is not mandatory.

## Technologies used

- Bun.Serve
- Bun.FileSystemRouter
- Preact for JSX
- tailwindcss

## Getting started

WIP. Go through example folder to get a glimpse of how things looks like from app developer's pov.

### Directory structure:

These are the folders that have special meaning to fresh-bun
|- .fresh-bun  - temporary runtime folder. Heavely used for dev environment. In production environment it is mainly
|                used to store the session db if sqlite based session middleware is enbaled. And also stores the 
|                manifest file that stores information about various client-side artifacts like client js, islands,
|                css etc.
|
|- client      - All the client js. There should be one entrypoint for client js.
|  |- islands  - Islands are special components that renders on the server side and hydrates on the client side.
|
|- public      - The default statically served directory. The files are served at the root. At built time publicly served 
|
|- dist        - The bundled app gets stored in this folder for production deployment, copy this folder.
|                files like css, client side js etc are copied to public folder along with what already exists in the
|                public folder.
|
|- routes      - Serves as the routed urls that can respond with either html pages or API responses like json results.
|
|- styles      - Css files should go here.
|- index.ts    - The entry point which starts the server.

### Starting dev server

Run `bun run dev`

### Building for production

Run `bun run build`

### Starting production server

Run commands
- `cd dist`
- `bun index.js`

