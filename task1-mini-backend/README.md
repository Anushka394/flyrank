# mini-backend (Java)

The smallest possible backend: a Java server with two JSON endpoints. No
frameworks, no Maven/Gradle, no dependencies — just the JDK's built-in
`com.sun.net.httpserver.HttpServer`.

Runs as a single-file source-code program (a Java 11+ feature), so there's
no separate compile step — `java Server.java` compiles and runs it in one go.

## Endpoints

| Method | Path         | Response                                  |
|--------|--------------|--------------------------------------------|
| GET    | `/api/hello` | `{ "message": "Hello, world!" }`           |
| GET    | `/api/time`  | `{ "time": "<current ISO-8601 timestamp>" }`|

## Run it

```bash
java Server.java
```

Requires JDK 11+ (uses the single-file source launcher). The server listens
on `http://localhost:3000`.

## Test it

**curl:**

```bash
curl http://localhost:3000/api/hello
curl http://localhost:3000/api/time
```

**Browser:**

Open [http://localhost:3000/api/hello](http://localhost:3000/api/hello) or
[http://localhost:3000/api/time](http://localhost:3000/api/time) directly —
these are `GET` requests, so the browser address bar can call them on its own.

## What this demonstrates

Every request the browser or curl sends travels over HTTP to this JVM
process, gets matched to a route via `HttpServer.createContext`, and a
response is written back as JSON. This is the request → response loop from
the lecture, seen from the server side — same idea as the Node.js version,
just on the JVM.
