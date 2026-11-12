package com.finix.banking.trading;

import java.util.List;

/** Every response is wrapped with mode=PAPER. Numeric values stay strings, as Alpaca sends them. */
public final class PaperModels {
    private PaperModels() {}
    public record Envelope<T>(String mode, String notice, T data) {
        public static <T> Envelope<T> of(T data) {
            return new Envelope<>("PAPER", "Simulated paper trading. No real money. Not connected to your FINIX accounts or ledger.", data);
        }
    }
    public record Status(boolean enabled, String mode, String provider) {}
    public record Account(String status, String cash, String equity, String buyingPower, String currency, boolean tradingBlocked) {}
    public record Position(String symbol, String qty, String side, String avgEntryPrice, String marketValue, String currentPrice, String unrealizedPl, String unrealizedPlpc) {}
    public record Order(String id, String clientOrderId, String symbol, String side, String type, String qty, String filledQty,
                        String filledAvgPrice, String status, String submittedAt) {}
    public record OrderRequest(String symbol, String side, Integer qty) {}
    public record Orders(List<Order> orders) {}
}
