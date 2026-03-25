## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

To release on NPM run `bunx npm login` then `nx release`. 

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Ports

    Demo
        4000    - UI
        
    Mesh
        5100    - Default mesh server port

    Portal
        3000    - API
        3001    - UI

    Caddy
        9000    - Caddy proxy to Portal

## Endpoints

### Server Health Check
- **GET /ping** - Returns 'pong' for server availability detection
  - Endpoint: `http://localhost:3000/ping`
  - Response: Plain text 'pong' with HTTP 200 status