package com.finix.banking.market;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;

/** Tiny local HTTP server standing in for Twelve Data / Alpaca. Records every request (path+query, headers, body). */
final class MockServer implements AutoCloseable {
    record Hit(String method, String uri, String authorization, String alpacaKey, String alpacaSecret, String body) {}
    record Reply(int status, String body, long delayMs) { Reply(int s, String b) { this(s, b, 0); } }

    final HttpServer server;
    final List<Hit> hits = new CopyOnWriteArrayList<>();
    volatile Function<Hit, Reply> handler = h -> new Reply(404, "{}");

    MockServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(8));
        server.createContext("/", this::handle);
        server.start();
    }
    private void handle(HttpExchange ex) throws IOException {
        String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Hit hit = new Hit(ex.getRequestMethod(), ex.getRequestURI().toString(), ex.getRequestHeaders().getFirst("Authorization"),
            ex.getRequestHeaders().getFirst("APCA-API-KEY-ID"), ex.getRequestHeaders().getFirst("APCA-API-SECRET-KEY"), body);
        hits.add(hit);
        Reply r = handler.apply(hit);
        try { if (r.delayMs() > 0) Thread.sleep(r.delayMs()); } catch (InterruptedException ignored) { }
        byte[] out = r.body().getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(r.status(), out.length);
        ex.getResponseBody().write(out);
        ex.close();
    }
    String url() { return "http://127.0.0.1:" + server.getAddress().getPort(); }
    @Override public void close() { server.stop(0); }
}
