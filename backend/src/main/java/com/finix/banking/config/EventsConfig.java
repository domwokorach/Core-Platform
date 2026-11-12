package com.finix.banking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables the SSE keepalive / token-expiry sweep. */
@Configuration
@EnableScheduling
public class EventsConfig {}
