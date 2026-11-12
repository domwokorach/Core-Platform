package com.finix.banking.events;

import java.util.UUID;

/**
 * Published inside the transaction that changes a customer's ledger-derived dashboard.
 * Delivered to SSE subscribers only after that transaction commits. Carries no financial data.
 */
public record DashboardChanged(UUID customerId, String reason) {}
