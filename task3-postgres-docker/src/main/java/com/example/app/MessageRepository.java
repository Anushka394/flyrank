package com.example.app;

import java.util.List;

/**
 * Storage contract. The service and routes only ever talk to this
 * interface — they never know whether rows live in memory or in Postgres.
 */
public interface MessageRepository {
    Message save(String content);
    List<Message> findAll();
}