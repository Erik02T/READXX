package com.readxx.tts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "readxx.tts", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsCacheService {

    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final RedisTemplate<String, byte[]> redisTemplate;

    public TtsCacheService(
        @Qualifier("ttsAudioRedisTemplate") RedisTemplate<String, byte[]> redisTemplate
    ) {
        this.redisTemplate = redisTemplate;
    }

    public String getKey(String text, String voice) {
        return sha256Hex(text + "::" + voice);
    }

    public Optional<byte[]> get(String text, String voice) {
        String key = "tts:" + getKey(text, voice);
        return Optional.ofNullable(redisTemplate.opsForValue().get(key));
    }

    public void put(@NonNull String text, @NonNull String voice, @NonNull byte[] audioBytes) {
        String key = "tts:" + getKey(text, voice);
        redisTemplate.opsForValue().set(key, audioBytes, CACHE_TTL);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available.", ex);
        }
    }
}
