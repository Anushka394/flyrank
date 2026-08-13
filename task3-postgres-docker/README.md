## How persistence was verified

1. Started the stack with `docker compose up --build` (via GitHub Codespaces,
   since local Docker Desktop had resource issues).
2. Created two messages via `POST /api/messages`.
3. Confirmed both appeared via `GET /api/messages`.
4. Ran `docker compose down` (stops containers, keeps the `pgdata` volume).
5. Ran `docker compose up` again.
6. Ran `GET /api/messages` again with no new writes — the same two messages
   were returned, confirming data persisted in the Postgres volume across
   a full container restart.