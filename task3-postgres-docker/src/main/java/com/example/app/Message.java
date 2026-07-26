package com.example.app;

import java.time.Instant;

public class Message {
    public final int id;
    public final String content;
    public final Instant createdAt;

    public Message(int id, String content, Instant createdAt) {
        this.id = id;
        this.content = content;
        this.createdAt = createdAt;
    }

    public String toJson() {
        String escaped = content.replace("\"", "\\\"");
        return "{\"id\": " + id + ", \"content\": \"" + escaped + "\", \"createdAt\": \"" + createdAt + "\"}";
    }
}