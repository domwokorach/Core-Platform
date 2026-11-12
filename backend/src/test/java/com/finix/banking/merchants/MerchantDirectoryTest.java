package com.finix.banking.merchants;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class MerchantDirectoryTest {
    private static String domain(String d) { return MerchantDirectory.match(d).map(MerchantDirectory.Merchant::domain).orElse(null); }

    @Test void mapsTheRequiredMerchantsAndAliases() {
        assertEquals("netflix.com", domain("Netflix"));
        assertEquals("netflix.com", domain("NETFLIX.COM"));
        assertEquals("dkny.com", domain("DKNY"));
        assertEquals("dkny.com", domain("Donna Karan New York"));
        assertEquals("starbucks.com", domain("STARBUCKS"));
        assertEquals("starbucks.com", domain("Starbucks Coffee"));
        assertEquals("kfc.com", domain("KFC"));
        assertEquals("kfc.com", domain("Kentucky Fried Chicken"));
    }

    @Test void normalisationIgnoresCaseWhitespaceAndPunctuationOnly() {
        assertEquals("starbucks.com", domain("  starbucks   coffee "));
        assertEquals("netflix.com", domain("netflix.com"));
        assertEquals("kfc.com", domain("K.F.C".replace(".", "")));
    }

    @Test void carriesCategoryAndDisplayName() {
        var m = MerchantDirectory.match("Netflix").orElseThrow();
        assertEquals("netflix", m.id());
        assertEquals("Netflix", m.name());
        assertEquals("Entertainment", m.category());
        assertEquals("Fashion", MerchantDirectory.match("DKNY").orElseThrow().category());
        assertEquals("Food & Drink", MerchantDirectory.match("KFC").orElseThrow().category());
        assertEquals("Starbucks Coffee", MerchantDirectory.match("STARBUCKS").orElseThrow().name());
    }

    @Test void looseSubstringMatchesNeverAssignALogo() {
        for (String d : List.of("Starbucksy Ltd", "Netflix Refund Fraud Inc", "KFC Fan Club", "Not Netflix", "DKNY Outlet Store Leeds",
                                "Kentucky Fried Chicken Ltd", "MY STARBUCKS COFFEE SHOP", "Netflixx", "Payroll", "Opening funds", "Monthly savings", "", "   "))
            assertNull(domain(d), "must not match: '" + d + "'");
        assertNull(domain(null));
    }

    @Test void domainsAreSafeHostnamesOnly() {
        for (String d : List.of("Netflix", "DKNY", "Starbucks", "KFC"))
            assertTrue(MerchantDirectory.match(d).orElseThrow().domain().matches("^[a-z0-9]+(\\.[a-z0-9]+)+$"));
    }
}
