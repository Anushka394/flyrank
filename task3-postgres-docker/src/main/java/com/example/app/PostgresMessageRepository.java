package com.example.app;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PostgresMessageRepository implements MessageRepository {
    private final String url;
    private final String user;
    private final String password;

    public PostgresMessageRepository(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    @Override
    public Message save(String content) {
        String sql = "INSERT INTO messages (content) VALUES (?) RETURNING id, content, created_at";
        try (Connection conn = connect();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, content);
            try (ResultSet rs = stmt.executeQuery()) {
                rs.next();
                return new Message(
                        rs.getInt("id"),
                        rs.getString("content"),
                        rs.getTimestamp("created_at").toInstant()
                );
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to save message", e);
        }
    }

    @Override
    public List<Message> findAll() {
        String sql = "SELECT id, content, created_at FROM messages ORDER BY id";
        List<Message> results = new ArrayList<>();
        try (Connection conn = connect();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                results.add(new Message(
                        rs.getInt("id"),
                        rs.getString("content"),
                        rs.getTimestamp("created_at").toInstant()
                ));
            }
            return results;
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch messages", e);
        }
    }
}