package com.readxx.tts;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import com.readxx.config.ReadxxTtsProperties;
import com.readxx.usage.UsageService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@ConditionalOnProperty(prefix = "readxx.tts", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsService {

    private static final Logger log = LoggerFactory.getLogger(TtsService.class);
    private static final String DEFAULT_MODEL = "tts-1";

    private final UsageService usageService;
    private final TtsCacheService ttsCacheService;
    private final WebClient openAiWebClient;
    private final ReadxxTtsProperties ttsProperties;
    private final DataBufferFactory dataBufferFactory = DefaultDataBufferFactory.sharedInstance;

    public TtsService(
        UsageService usageService,
        TtsCacheService ttsCacheService,
        WebClient openAiWebClient,
        ReadxxTtsProperties ttsProperties
    ) {
        this.usageService = usageService;
        this.ttsCacheService = ttsCacheService;
        this.openAiWebClient = openAiWebClient;
        this.ttsProperties = ttsProperties;
    }

    public Flux<DataBuffer> streamTts(UUID userId, String plan, TtsRequest request) {
        String text = request.text();
        if (!StringUtils.hasText(text)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text is required.");
        }
        if (text.length() > 10_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text exceeds max length (10000).");
        }
        if (!StringUtils.hasText(request.voice())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voice is required.");
        }

        // ✓ Check quota — throws RateLimitException if exceeded
        usageService.checkAndIncrementTtsOrThrow(userId, plan, text.length());

        return ttsCacheService.get(text, request.voice())
            .map(bytes -> Flux.just(dataBufferFactory.wrap(bytes)))
            .orElseGet(() -> streamFromOpenAi(text, request.voice(), resolveModel(request.model())));
    }

    private Flux<DataBuffer> streamFromOpenAi(String text, String voice, String model) {
        if (!StringUtils.hasText(ttsProperties.getOpenaiApiKey())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "TTS provider is not configured.");
        }

        ByteArrayOutputStream collected = new ByteArrayOutputStream();

        return openAiWebClient.post()
            .uri("/v1/audio/speech")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + ttsProperties.getOpenaiApiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.valueOf("audio/mpeg"))
            .bodyValue(Map.of(
                "model", model,
                "input", text,
                "voice", voice,
                "response_format", "mp3"))
            .retrieve()
            .onStatus(
                status -> status.isError(),
                response -> response.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(body -> Mono.error(
                        new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Upstream TTS provider error."))))
            .bodyToFlux(DataBuffer.class)
            .doOnNext(buffer -> copyChunk(buffer, collected))
            .doOnComplete(() -> cacheInBackground(text, voice, collected.toByteArray()));
    }

    private void copyChunk(DataBuffer buffer, ByteArrayOutputStream out) {
        ByteBuffer byteBuffer = buffer.toByteBuffer().asReadOnlyBuffer();
        byte[] chunk = new byte[byteBuffer.remaining()];
        byteBuffer.get(chunk);
        try {
            out.write(chunk);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to buffer TTS stream.", ex);
        }
    }

    private void cacheInBackground(String text, String voice, byte[] bytes) {
        if (bytes.length == 0) {
            return;
        }

        Mono.fromRunnable(() -> ttsCacheService.put(text, voice, bytes))
            .subscribeOn(Schedulers.boundedElastic())
            .doOnError(ex -> log.warn("Failed to cache TTS audio for voice={}", voice, ex))
            .subscribe();
    }

    private String resolveModel(String requestedModel) {
        if (!StringUtils.hasText(requestedModel)) {
            return DEFAULT_MODEL;
        }
        return requestedModel.trim();
    }
}
