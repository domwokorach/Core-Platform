package com.finix.banking.events;

import java.util.UUID;

/**
 * Published inside the transaction that changes a card. Delivered to that customer's card streams only after commit.
 * {@code type} is the SSE event name, e.g. {@code card.frozen}. Carries identifiers only.
 */
public record CardChanged(UUID customerId, UUID cardId, String type) {}
