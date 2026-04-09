package com.readxx.translate;

import com.readxx.auth.User;
import com.readxx.auth.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/translate")
@PreAuthorize("isAuthenticated()")
@ConditionalOnProperty(prefix = "readxx.translate", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TranslateController {

    private static final int MAX_REQUESTS_PER_HOUR = 100;
    private static final int FREE_DAILY_LIMIT = 20;

    private final LlmClient llmClient;
    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public TranslateController(
        LlmClient llmClient,
        StringRedisTemplate redisTemplate,
        UserRepository userRepository,
        JdbcTemplate jdbcTemplate
    ) {
        this.llmClient = llmClient;
        this.redisTemplate = redisTemplate;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping
    public ResponseEntity<?> translate(@Valid @RequestBody TranslateRequest request) {
        UUID userId = currentUserId();
        String plan = resolvePlan(userId);

        try {
            enforceHourlyLimit(userId);
        } catch (TranslateRateLimitException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()))
                .body(ex.getMessage());
        }

        enforceFreeDailyLimit(userId, plan);
        String translated = llmClient.translate(
            request.text().trim(),
            request.sourceLang().trim(),
            request.targetLang().trim()
        );
        logUsage(userId);

        return ResponseEntity.ok(new TranslateResponse(translated));
    }

    @PostMapping("/explain")
    public ResponseEntity<?> explain(@Valid @RequestBody ExplainRequest request) {
        UUID userId = currentUserId();
        String plan = resolvePlan(userId);

        try {
            enforceHourlyLimit(userId);
        } catch (TranslateRateLimitException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.retryAfterSeconds()))
                .body(ex.getMessage());
        }

        enforceFreeDailyLimit(userId, plan);
        String explanation = llmClient.explain(
            request.word().trim(),
            request.context().trim(),
            request.lang().trim()
        );
        logUsage(userId);

        return ResponseEntity.ok(new ExplainResponse(explanation));
    }

    private void enforceHourlyLimit(UUID userId) {
        String key = "ratelimit:translate:" + userId;
        long nowMs = Instant.now().toEpochMilli();
        long windowStart = nowMs - Duration.ofHours(1).toMillis();

        redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);
        Long count = redisTemplate.opsForZSet().zCard(key);
        if (count != null && count >= MAX_REQUESTS_PER_HOUR) {
            Set<String> oldestEntry = redisTemplate.opsForZSet().range(key, 0, 0);
            long retryAfter = 60L;
            if (oldestEntry != null && !oldestEntry.isEmpty()) {
                String first = oldestEntry.iterator().next();
                String firstTimestamp = first.split(":", 2)[0];
                try {
                    long oldestMs = Long.parseLong(firstTimestamp);
                    long availableAt = oldestMs + Duration.ofHours(1).toMillis();
                    retryAfter = Math.max(1L, (availableAt - nowMs + 999L) / 1000L);
                } catch (NumberFormatException ignored) {
                    retryAfter = 60L;
                }
            }
            throw new TranslateRateLimitException("Hourly translate limit reached", retryAfter);
        }

        String member = nowMs + ":" + UUID.randomUUID();
        redisTemplate.opsForZSet().add(key, member, nowMs);
        redisTemplate.expire(key, Duration.ofHours(2));
    }

    private void enforceFreeDailyLimit(UUID userId, String plan) {
        if ("premium".equalsIgnoreCase(plan)) {
            return;
        }

        Integer usedToday = jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(SUM(units), 0)
            FROM usage_logs
            WHERE user_id = ?
              AND feature = 'translate'
              AND logged_at >= date_trunc('day', now())
            """,
            Integer.class,
            userId
        );

        int current = usedToday == null ? 0 : usedToday;
        if (current >= FREE_DAILY_LIMIT) {
            throw new ResponseStatusException(
                HttpStatus.PAYMENT_REQUIRED,
                "Free plan daily translate limit reached.");
        }
    }

    private void logUsage(UUID userId) {
        jdbcTemplate.update(
            "INSERT INTO usage_logs (user_id, feature, units, logged_at) VALUES (?, 'translate', 1, now())",
            userId
        );
    }

    private String resolvePlan(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));

        if (!StringUtils.hasText(user.getPlan())) {
            return "free";
        }
        return user.getPlan().trim().toLowerCase();
    }

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    public record TranslateRequest(
        @NotBlank String text,
        @NotBlank String sourceLang,
        @NotBlank String targetLang
    ) {
    }

    public record ExplainRequest(
        @NotBlank String word,
        @NotBlank String context,
        @NotBlank String lang
    ) {
    }

    public record TranslateResponse(String translation) {
    }

    public record ExplainResponse(String explanation) {
    }

    private static class TranslateRateLimitException extends RuntimeException {

        private final long retryAfterSeconds;

        TranslateRateLimitException(String message, long retryAfterSeconds) {
            super(message);
            this.retryAfterSeconds = retryAfterSeconds;
        }

        long retryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
