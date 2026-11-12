package com.finix.banking.market;

import java.util.List;
import java.util.Optional;

/** Server-side allow-list. Only these instruments can be requested, quoted or (paper) traded. */
public final class Instruments {
    public record Instrument(String symbol, String name, String exchange, String externalUrl) {}

    public static final List<Instrument> WATCHLIST = List.of(
        new Instrument("AAPL", "Apple Inc.", "NASDAQ", "https://www.nasdaq.com/market-activity/stocks/aapl"),
        new Instrument("MSFT", "Microsoft Corporation", "NASDAQ", "https://www.nasdaq.com/market-activity/stocks/msft"),
        new Instrument("NVDA", "NVIDIA Corporation", "NASDAQ", "https://www.nasdaq.com/market-activity/stocks/nvda"),
        new Instrument("NFLX", "Netflix Inc.", "NASDAQ", "https://www.nasdaq.com/market-activity/stocks/nflx"));

    private Instruments() {}

    public static Optional<Instrument> find(String symbol) {
        return symbol == null ? Optional.empty() : WATCHLIST.stream().filter(i -> i.symbol().equals(symbol.trim().toUpperCase())).findFirst();
    }

    /** Throws 404-style MarketException for anything outside the watchlist. */
    public static Instrument require(String symbol) {
        return find(symbol).orElseThrow(() -> new MarketException("UNKNOWN_SYMBOL", 400, "Unsupported symbol. Supported: AAPL, MSFT, NVDA, NFLX."));
    }
}
