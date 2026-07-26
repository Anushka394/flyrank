package com.example.app;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Server {

    public static void main(String[] args) throws IOException {
        String databaseUrl = System.getenv("DATABASE_URL");
        MessageRepository repository;

        if (databaseUrl != null && !databaseUrl.isBlank()) {
            String user = System.getenv().getOrDefault("DB_USER", "postgres");
            String password = System.getenv().getOrDefault("DB_PASSWORD", "postgres");
            repository = new PostgresMessageRepository(databaseUrl, user, password);
            System.out.println("Using PostgresMessageRepository -> " + databaseUrl);
        } else {
            repository = new InMemoryMessageRepository();
            System.out.println("Using InMemoryMessageRepository (no DATABASE_URL set)");
        }

        MessageService service = new MessageService(repository);

        HttpServer server = HttpServer.create(new InetSocketAddress(3000), 0);

        // Unchanged from A2
        server.createContext("/api/hello", exchange -> {
            respond(exchange, 200, "{\"message\": \"Hello, world!\"}");
        });

        // Unchanged from A2
        server.createContext("/api/time", exchange -> {
            respond(exchange, 200, "{\"time\": \"" + Instant.now() + "\"}");
        });

        // New this week: backed by whichever repository was selected above
        server.createContext("/api/messages", exchange -> {
            String method = exchange.getRequestMethod();
            if (method.equals("POST")) {
                String body = readBody(exchange.getRequestBody());
                String content = extractContent(body);
                try {
                    Message m = service.createMessage(content);
                    respond(exchange, 201, m.toJson());
                } catch (IllegalArgumentException e) {
                    respond(exchange, 400, "{\"error\": \"" + e.getMessage() + "\"}");
                }
            } else if (method.equals("GET")) {
                List<Message> messages = service.listMessages();
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < messages.size(); i++) {
                    if (i > 0) sb.append(",");
                    sb.append(messages.get(i).toJson());
                }
                sb.append("]");
                respond(exchange, 200, sb.toString());
            } else {
                respond(exchange, 405, "{\"error\": \"method not allowed\"}");
            }
        });

        server.setExecutor(null);
        server.start();
        System.out.println("Server running on http://localhost:3000");
    }

    private static void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static String readBody(InputStream is) throws IOException {
        return new String(is.readAllBytes(), StandardCharsets.UTF_8);
    }

    // Minimal, dependency-free JSON field extraction: {"content": "..."}
    private static String extractContent(String json) {
        Pattern p = Pattern.compile("\"content\"\\s*:\\s*\"(.*?)\"");
        Matcher m = p.matcher(json);
        return m.find() ? m.group(1) : "";
    }
}