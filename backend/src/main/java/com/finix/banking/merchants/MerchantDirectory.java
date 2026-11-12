package com.finix.banking.merchants;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Verified merchant directory. A transaction descriptor is matched by its NORMALISED FORM against an explicit list of known
 * aliases (exact match, never substring), so "Starbucks Coffee" is Starbucks but "Starbucksy Ltd", "Netflix Refund Fraud Inc"
 * or "KFC Fan Club" are NOT. Unknown descriptors yield no merchant and the UI shows a neutral icon.
 *
 * <p>Only the verified {@code domain} ever leaves FINIX (the browser requests the logo for that domain); descriptors,
 * amounts and customer data are never sent to the logo provider.
 */
public final class MerchantDirectory {
    public record Merchant(String id, String name, String domain, String category) {}

    private record Entry(Merchant merchant, List<String> aliases) {}

    private static final List<Entry> ENTRIES = List.of(
        new Entry(new Merchant("netflix", "Netflix", "netflix.com", "Entertainment"), List.of("NETFLIX", "NETFLIX.COM")),
        new Entry(new Merchant("dkny", "DKNY", "dkny.com", "Fashion"), List.of("DKNY", "DONNA KARAN NEW YORK")),
        new Entry(new Merchant("starbucks", "Starbucks Coffee", "starbucks.com", "Food & Drink"), List.of("STARBUCKS", "STARBUCKS COFFEE")),
        new Entry(new Merchant("kfc", "KFC", "kfc.com", "Food & Drink"), List.of("KFC", "KENTUCKY FRIED CHICKEN")));

    private static final Map<String, Merchant> BY_ALIAS = index();

    private MerchantDirectory() {}

    private static Map<String, Merchant> index() {
        Map<String, Merchant> m = new HashMap<>();
        for (Entry e : ENTRIES) for (String alias : e.aliases()) m.put(normalise(alias), e.merchant());
        return Map.copyOf(m);
    }

    /** Upper-case, every run of non-alphanumerics becomes one space, trimmed ("Netflix.com" → "NETFLIX COM"). */
    static String normalise(String descriptor) {
        return descriptor == null ? "" : descriptor.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", " ").trim();
    }

    public static Optional<Merchant> match(String descriptor) {
        String key = normalise(descriptor);
        return key.isEmpty() ? Optional.empty() : Optional.ofNullable(BY_ALIAS.get(key));
    }
}
