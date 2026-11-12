package com.finix.banking.api;

import com.finix.banking.cards.CardApiException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrorHandler {
    @ExceptionHandler(CardApiException.class)
    public ResponseEntity<Map<String, Object>> handleCard(CardApiException e) {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", e.getReason()); body.put("code", e.code());
        var response = ResponseEntity.status(e.getStatusCode()).contentType(MediaType.APPLICATION_JSON);
        if (e.retryAfterSeconds() != null) { body.put("retryAfterSeconds", e.retryAfterSeconds()); response.header("Retry-After", String.valueOf(e.retryAfterSeconds())); }
        return response.body(body);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleMalformed(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Malformed request"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).contentType(MediaType.APPLICATION_JSON).body(Map.of("message", e.getReason() == null ? "Request failed" : e.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid transfer request"));
    }
}
