# sampleNest — a small NestJS learning project

A tiny "Tasks" REST API built to show off the core building blocks of
[NestJS](https://nestjs.com) in one small, readable codebase. Read this file
top to bottom, then poke around `src/`.

## Run it

```bash
npm install
npm run start:dev   # restarts on file changes, logs to the console
```

The server listens on `http://localhost:3000` (override with `PORT` in `.env`).

Try it:

```bash
curl http://localhost:3000/tasks
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn guards"}'
```

Run the tests: `npm test`

## The mental model

A Nest app is a tree of **modules**. Each module bundles the pieces that
belong together: **controllers** (handle HTTP), **providers** (business
logic, usually called **services**), and whatever else that feature needs.
Nest wires it all together for you at startup using **dependency injection**
— you declare what a class needs in its constructor, and Nest supplies it.

```
AppModule (root)
├── ConfigModule        — reads .env, makes ConfigService injectable everywhere
└── TasksModule          — our feature module
    ├── TasksController  — HTTP layer: routes, request/response
    └── TasksService     — business logic: an in-memory array of tasks
```

## Where each concept lives

| Concept | File | What it's doing |
|---|---|---|
| Module | [src/tasks/tasks.module.ts](src/tasks/tasks.module.ts), [src/app.module.ts](src/app.module.ts) | Groups a controller + service; root module imports the feature module |
| Controller | [src/tasks/tasks.controller.ts](src/tasks/tasks.controller.ts) | Maps HTTP verbs/routes to methods: `@Get()`, `@Post()`, `@Param()`, `@Body()`, `@Query()` |
| Provider / Service | [src/tasks/tasks.service.ts](src/tasks/tasks.service.ts) | `@Injectable()` class holding the actual logic and data |
| Dependency Injection | [src/tasks/tasks.controller.ts](src/tasks/tasks.controller.ts) constructor | Controller asks for `TasksService`; Nest supplies the instance — nothing is ever manually `new`'d |
| DTO + validation | [src/tasks/dto/create-task.dto.ts](src/tasks/dto/create-task.dto.ts), [src/tasks/dto/update-task.dto.ts](src/tasks/dto/update-task.dto.ts) | `class-validator` decorators describe what a valid request body looks like |
| Pipe | [src/main.ts](src/main.ts) | A global `ValidationPipe` checks every request body against its DTO *before* the controller method runs |
| Exception handling | [src/tasks/tasks.service.ts](src/tasks/tasks.service.ts) | Throwing `NotFoundException` is automatically turned into a `404` JSON response — no manual try/catch in the controller |
| Middleware | [src/common/logger.middleware.ts](src/common/logger.middleware.ts) | Runs on *every* request (wired up in `app.module.ts`'s `configure()`); logs method/path/status/duration |
| Interceptor | [src/common/response.interceptor.ts](src/common/response.interceptor.ts) | Wraps every successful `TasksController` response in a `{ success, data, timestamp }` envelope |
| Guard | [src/common/api-key.guard.ts](src/common/api-key.guard.ts) | Blocks `DELETE /tasks/:id` unless an `x-api-key` header matches — runs *before* the handler |
| Config | [.env](.env), used via `ConfigService` in the guard | Environment variables, loaded once via `ConfigModule.forRoot()` |

That's most of what you'll touch day-to-day in a real Nest app. The official
docs (https://docs.nestjs.com) go deeper on each one.

## The request lifecycle, in order

For `DELETE /tasks/:id`, a request passes through, in this order:

1. **Middleware** — `LoggerMiddleware` runs first, for every route.
2. **Guard** — `ApiKeyGuard` checks the `x-api-key` header. If it fails, the
   request stops here with a `401`.
3. **Pipe** — any `@Body()`/`@Param()`/`@Query()` argument gets validated
   and transformed (not much to validate on a DELETE, but this is where
   `CreateTaskDto`/`UpdateTaskDto` get checked on POST/PATCH).
4. **Controller method** runs, delegates to `TasksService`.
5. **Interceptor** — `ResponseInterceptor` reshapes whatever the method
   returned into the `{ success, data, timestamp }` envelope.
6. Response sent.

If a step throws (like `TasksService.findOne` throwing `NotFoundException`),
Nest's built-in **exception filter** catches it and turns it into the right
HTTP status + JSON body automatically.

## Try every endpoint

```bash
# List (optionally filter by done status)
curl http://localhost:3000/tasks
curl "http://localhost:3000/tasks?done=false"

# Get one
curl http://localhost:3000/tasks/<id>

# Create — title is required (min 3 chars), description/done are optional
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Read the Nest docs","description":"Start with Controllers"}'

# This fails validation (title too short) -> 400
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" -d '{"title":"ab"}'

# This fails too (unknown field is rejected, not silently dropped) -> 400
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" -d '{"title":"Valid title","nope":"field"}'

# Partial update
curl -X PATCH http://localhost:3000/tasks/<id> \
  -H "Content-Type: application/json" -d '{"done":true}'

# Delete requires the API key guard -> 401 without it
curl -X DELETE http://localhost:3000/tasks/<id>

# ...-> 200 with it (key is set in .env, defaults to "nest-rocks")
curl -X DELETE http://localhost:3000/tasks/<id> -H "x-api-key: nest-rocks"
```

## A couple of things worth knowing about this setup

- **ESM + NodeNext**: this project uses `"type": "module"` and
  `moduleResolution: "nodenext"`, which is why every relative import ends in
  `.js` (e.g. `./tasks.service.js`) even though the source file is `.ts`.
  That's required by Node's ESM resolver, not a typo.
- **In-memory data**: `TasksService` stores tasks in a plain array, so data
  resets whenever the app restarts. Swapping it for a real database (e.g.
  TypeORM or Prisma) later would only change `tasks.service.ts` — the
  controller, DTOs, and routes stay the same. That isolation is the whole
  point of the layered module/controller/service structure.
- **Why the DELETE route uses a Guard but POST/PATCH don't**: it's just to
  show Guards in action without gating the whole API — in a real app you'd
  typically protect most or all routes consistently.

## Natural next steps

- Add a database (e.g. `@nestjs/typeorm` + SQLite/Postgres) instead of the
  in-memory array.
- Add Swagger docs with `@nestjs/swagger` — it reads your DTOs and
  controllers and generates an interactive API explorer for free.
- Add a global **exception filter** (`@Catch()`) to customize error
  response shape, mirroring how `ResponseInterceptor` customizes success
  responses.
- Write an e2e test (see `test/`) that spins up the whole app and drives it
  through HTTP, rather than unit-testing the service in isolation.
