package com.finix.banking.market;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Structured errors: `{code, message, retryAfterSeconds?}`. `message` matches the shape the other FINIX endpoints use. */
@RestControllerAdvice(basePackages = {"com.finix.banking.market", "com.finix.banking.trading"})
public class MarketErrorAdvice {
    @ExceptionHandler(MarketException.class)
    public ResponseEntity<Map<String, Object>> handle(MarketException e) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", e.code);
        body.put("message", e.getMessage());
        if (e.retryAfterSeconds != null) body.put("retryAfterSeconds", e.retryAfterSeconds);
        ResponseEntity.BodyBuilder b = ResponseEntity.status(e.httpStatus).contentType(MediaType.APPLICATION_JSON);
        if (e.retryAfterSeconds != null) b.header(HttpHeaders.RETRY_AFTER, String.valueOf(e.retryAfterSeconds));
        return b.body(body);
    }
}
