package com.example.app;

import java.util.List;

/**
 * Business logic layer. Depends only on the MessageRepository interface —
 * it has no idea whether it's talking to an ArrayList or a Postgres table.
 * This class does not change when we swap the repository implementation.
 */
public class MessageService {
    private final MessageRepository repository;

    public MessageService(MessageRepository repository) {
        this.repository = repository;
    }

    public Message createMessage(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content must not be blank");
        }
        return repository.save(content);
    }

    public List<Message> listMessages() {
        return repository.findAll();
    }
}