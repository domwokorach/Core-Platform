package com.finix.banking.cards;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Card API failure with a stable machine-readable {@code code} for the client. */
public class CardApiException extends ResponseStatusException {
    private final String code;
    private final Long retryAfterSeconds;

    public CardApiException(HttpStatus status, String code, String message) { this(status, code, message, null); }

    public CardApiException(HttpStatus status, String code, String message, Long retryAfterSeconds) {
        super(status, message);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public String code() { return code; }
    public Long retryAfterSeconds() { return retryAfterSeconds; }
}
