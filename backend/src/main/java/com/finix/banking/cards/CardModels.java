package com.finix.banking.cards;

import java.time.Instant;
import java.util.UUID;

/** API shapes for the sandbox card module. Deliberately contains no balances and no payment-card numbers. */
public final class CardModels {
    private CardModels() {}

    public record LinkedAccount(UUID id, String displayName, String maskedNumber) {}
    public record Limits(long dailyLimitMinor, long monthlyLimitMinor, long singleTransactionLimitMinor, boolean onlineEnabled) {}
    public record Spending(long dailySpentMinor, long monthlySpentMinor) {}
    public record CardView(UUID id, String cardType, String status, String maskedReference, String currency,
                           String cardholderName, LinkedAccount linkedAccount, Limits limits, Spending spending,
                           Instant createdAt, Instant activatedAt, Instant updatedAt) {}

    public record CreateCardRequest(@jakarta.validation.constraints.NotNull UUID accountId,
                                    @jakarta.validation.constraints.NotNull String cardType) {}
    /** Every field optional (PATCH); omitted fields keep their current value. */
    public record LimitsRequest(Long dailyLimitMinor, Long monthlyLimitMinor, Long singleTransactionLimitMinor, Boolean onlineEnabled) {}
    public record AuthorizationRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 80) String merchantName,
                                       long amountMinor, @jakarta.validation.constraints.NotNull String channel) {}

    public record CardTransaction(UUID id, UUID cardId, String merchantName, long amountMinor, String currency,
                                  String channel, String outcome, String declineReason, Instant occurredAt) {}
    public record CardActivity(UUID id, UUID cardId, String eventType, Instant occurredAt) {}
}
