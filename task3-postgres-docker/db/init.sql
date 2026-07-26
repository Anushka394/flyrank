CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);