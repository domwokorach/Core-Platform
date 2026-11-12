package com.finix.banking.ledger;

import java.util.Set;

/** Supported currencies. Only GBP: no FX or cross-currency posting exists, so anything else is rejected. */
public final class Currencies {
    public static final String GBP = "GBP";
    public static final Set<String> SUPPORTED = Set.of(GBP);
    private Currencies() {}

    public static boolean isSupported(String currency) { return currency != null && SUPPORTED.contains(currency.trim()); }
}
