import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.Instant;

public class Server {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(3000), 0);

        server.createContext("/api/hello", exchange -> {
            String json = "{\"message\": \"Hello, world!\"}";
            byte[] bytes = json.getBytes();
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });

        server.createContext("/api/time", exchange -> {
            String json = "{\"time\": \"" + Instant.now() + "\"}";
            byte[] bytes = json.getBytes();
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });

        server.setExecutor(null);
        server.start();
        System.out.println("Server running on http://localhost:3000");
    }
}
