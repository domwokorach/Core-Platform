package com.finix.banking;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Real PostgreSQL 16 for integration tests: a Testcontainers container by default. Setting FINIX_TEST_DB_URL
 * (plus FINIX_TEST_DB_USER / FINIX_TEST_DB_PASSWORD) points the tests at an existing empty database instead,
 * for machines without Docker. CI uses the container.
 */
final class TestDatabase {
    private static final String EXTERNAL_URL = System.getenv("FINIX_TEST_DB_URL");
    private static PostgreSQLContainer<?> container;

    private TestDatabase() {}

    static synchronized void register(DynamicPropertyRegistry props) {
        if (EXTERNAL_URL != null) {
            props.add("spring.datasource.url", () -> EXTERNAL_URL);
            props.add("spring.datasource.username", () -> System.getenv().getOrDefault("FINIX_TEST_DB_USER", "finix"));
            props.add("spring.datasource.password", () -> System.getenv().getOrDefault("FINIX_TEST_DB_PASSWORD", "test"));
            return;
        }
        if (container == null) {
            container = new PostgreSQLContainer<>("postgres:16-alpine").withDatabaseName("finix").withUsername("finix").withPassword("test");
            container.start(); // reaped by Testcontainers' Ryuk on JVM exit
        }
        props.add("spring.datasource.url", container::getJdbcUrl);
        props.add("spring.datasource.username", container::getUsername);
        props.add("spring.datasource.password", container::getPassword);
    }
}
