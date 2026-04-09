package com.readxx.translate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.readxx.config.ReadxxTtsProperties;

import reactor.core.publisher.Mono;

@Service
@ConditionalOnProperty(prefix = "readxx.translate", name = "enabled", havingValue = "true", matchIfMissing = true)
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    private static final String MODEL = "gpt-4o-mini";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final WebClient openAiWebClient;
    private final ReadxxTtsProperties ttsProperties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public LlmClient(
        WebClient openAiWebClient,
        ReadxxTtsProperties ttsProperties,
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper
    ) {
        this.openAiWebClient = openAiWebClient;
        this.ttsProperties = ttsProperties;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public String translate(@NonNull String text, @NonNull String srcLang, @NonNull String tgtLang) {
        String systemPrompt = "You are a translator. Respond ONLY with the translation, no explanation.";
        String userPrompt = "Translate from " + srcLang + " to " + tgtLang + ":\n" + text;
        return callWithCache(systemPrompt, userPrompt);
    }

    public String explain(@NonNull String word, @NonNull String context, @NonNull String lang) {
        String systemPrompt = "You are a language tutor. Given a word and its context sentence, provide: "
            + "1) definition in " + lang + " 2) example sentence 3) etymology. "
            + "Be concise (max 3 sentences).";
        String userPrompt = "Word: " + word + "\nContext: " + context;
        return callWithCache(systemPrompt, userPrompt);
    }

    private String callWithCache(@NonNull String systemPrompt, @NonNull String userPrompt) {
        String cacheKey = "llm:" + sha256Hex(systemPrompt + "\n---\n" + userPrompt);
        String cached = safeCacheGet(cacheKey);
        if (StringUtils.hasText(cached)) {
            return cached;
        }

        String apiKey = ttsProperties.getOpenaiApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OpenAI API key is not configured.");
        }

        String rawResponse = openAiWebClient.post()
            .uri("/v1/chat/completions")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "model", MODEL,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt))))
            .retrieve()
            .onStatus(HttpStatusCode::isError, response ->
                response.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(body -> Mono.error(new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Translation provider error."))))
            .bodyToMono(String.class)
            .block();

        String content = extractMessageContent(rawResponse);
        safeCachePut(cacheKey, content);
        return content;
    }

    private String extractMessageContent(@NonNull String rawResponse) {
        if (!StringUtils.hasText(rawResponse)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from translation provider.");
        }

        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            String content = root.path("choices").path(0).path("message").path("content").asText(null);
            if (!StringUtils.hasText(content)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Invalid response from translation provider.");
            }
            return content.trim();
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to parse translation response.");
        }
    }

    private String safeCacheGet(@NonNull String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (RuntimeException ex) {
            log.warn("Skipping llm cache read due to redis error key={}", key, ex);
            return null;
        }
    }

    private void safeCachePut(@NonNull String key, @NonNull String value) {
        try {
            redisTemplate.opsForValue().set(key, value, CACHE_TTL);
        } catch (RuntimeException ex) {
            log.warn("Skipping llm cache write due to redis error key={}", key, ex);
        }
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available.", ex);
        }
    }
}
