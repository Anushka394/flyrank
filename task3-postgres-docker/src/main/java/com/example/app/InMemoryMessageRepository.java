package com.example.app;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class InMemoryMessageRepository implements MessageRepository {
    private final List<Message> store = Collections.synchronizedList(new ArrayList<>());
    private final AtomicInteger nextId = new AtomicInteger(1);

    @Override
    public Message save(String content) {
        Message m = new Message(nextId.getAndIncrement(), content, Instant.now());
        store.add(m);
        return m;
    }

    @Override
    public List<Message> findAll() {
        return new ArrayList<>(store);
    }
}