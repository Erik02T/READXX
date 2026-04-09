package com.readxx.usage;

import com.readxx.exception.RateLimitException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

/**
 * ✓ Daily quota and usage tracking with Redis — atomic, distributed.
 * Enforces per-user limits for TTS, Translate, OCR, etc.
 */
@Service
public class UsageService {

    private final StringRedisTemplate redisTemplate;

    // ✓ Lua script for atomic check-and-increment (prevents race conditions)
    private static final RedisScript<Long> ATOMIC_INCR_SCRIPT = RedisScript.of(
        "local cur = redis.call('INCRBY', KEYS[1], ARGV[1])\n" +
        "if cur == tonumber(ARGV[1]) then\n" +
        "  redis.call('EXPIRE', KEYS[1], ARGV[2])\n" +
        "end\n" +
        "return cur",
        Long.class
    );

    public UsageService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * ✓ Daily TTS quota check — free: 10k chars, premium: 500k chars.
     * Throws exception if limit exceeded before consuming quota.
     */
    public void checkAndIncrementTtsOrThrow(UUID userId, String plan, int charCount)
            throws RateLimitException {
        String key = "quota:tts:" + userId + ":" + LocalDate.now();
        int limit = "premium".equals(plan) ? 500_000 : 10_000;

        Long secondsUntilMidnight = getSecondsUntilMidnight();

        // ✓ Atomic increment with automatic expiry
        Long current = redisTemplate.execute(ATOMIC_INCR_SCRIPT,
            java.util.List.of(key),
            String.valueOf(charCount),
            String.valueOf(secondsUntilMidnight));

        if (current != null && current > limit) {
            // ✓ Decrement back before throwing — don't consume quota on failed request
            redisTemplate.opsForValue().decrement(key, charCount);
            long remaining = Math.max(0, limit - (current - charCount));
            throw new RateLimitException(
                "TTS daily limit exceeded. " + remaining + " chars remaining. Resets at midnight UTC.");
        }
    }

    /**
     * ✓ Sliding window rate limit for Translate/Explain — 100 requests/hour.
     */
    public void checkTranslateLimitOrThrow(UUID userId) throws RateLimitException {
        String key = "rl:translate:" + userId;
        long now = System.currentTimeMillis();
        long windowStart = now - 3_600_000L; // 1 hour ago

        // ✓ Remove old entries outside the window
        redisTemplate.opsForZSet().removeRangeByScore(key, 0, windowStart);

        Long count = redisTemplate.opsForZSet().zCard(key);
        if (count != null && count >= 100) {
            throw new RateLimitException("Translate limit: 100 requests per hour");
        }

        // ✓ Add current request with timestamp as score
        redisTemplate.opsForZSet().add(key, UUID.randomUUID().toString(), now);
        redisTemplate.expire(key, java.time.Duration.ofHours(2));
    }

    /**
     * ✓ Daily OCR quota — free: 20 images, premium: 200 images.
     */
    public void checkOcrLimitOrThrow(UUID userId, String plan) throws RateLimitException {
        String key = "quota:ocr:" + userId + ":" + LocalDate.now();
        int limit = "premium".equals(plan) ? 200 : 20;

        Long secondsUntilMidnight = getSecondsUntilMidnight();

        // ✓ Atomic increment
        Long current = redisTemplate.execute(ATOMIC_INCR_SCRIPT,
            java.util.List.of(key),
            "1",
            String.valueOf(secondsUntilMidnight));

        if (current != null && current > limit) {
            // ✓ Decrement back
            redisTemplate.opsForValue().decrement(key);
            throw new RateLimitException(
                "OCR daily limit exceeded (" + limit + " per day). Try again tomorrow.");
        }
    }

    /**
     * Get current usage for logging
     */
    public long getCurrentTtsUsage(UUID userId) {
        String key = "quota:tts:" + userId + ":" + LocalDate.now();
        String value = redisTemplate.opsForValue().get(key);
        return value != null ? Long.parseLong(value) : 0L;
    }

    private long getSecondsUntilMidnight() {
        LocalDate tomorrow = LocalDate.now(ZoneId.of("UTC")).plusDays(1);
        Instant midnightUtc = tomorrow.atStartOfDay(ZoneId.of("UTC")).toInstant();
        return Math.max(1, (midnightUtc.getEpochSecond() - Instant.now().getEpochSecond()));
    }
}
