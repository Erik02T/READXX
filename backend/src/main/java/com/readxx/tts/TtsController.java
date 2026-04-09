package com.readxx.tts;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.readxx.auth.User;
import com.readxx.auth.UserRepository;
import com.readxx.exception.RateLimitException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/tts")
@PreAuthorize("isAuthenticated()")
@ConditionalOnProperty(prefix = "readxx.tts", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TtsController {

    private static final Logger log = LoggerFactory.getLogger(TtsController.class);

    private final TtsService ttsService;
    private final UserRepository userRepository;

    public TtsController(TtsService ttsService, UserRepository userRepository) {
        this.ttsService = ttsService;
        this.userRepository = userRepository;
    }

    @PostMapping("/stream")
    public ResponseEntity<?> stream(@Valid @RequestBody TtsRequest request) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));

        int charCount = request.text() == null ? 0 : request.text().length();
        log.info("TTS request userId={} charCount={} voice={}", userId, charCount, request.voice());

        try {
            return ResponseEntity.ok()
                .contentType(MediaType.valueOf("audio/mpeg"))
                .header(HttpHeaders.TRANSFER_ENCODING, "chunked")
                .body(ttsService.streamTts(userId, user.getPlan(), request));
        } catch (RateLimitException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "60")
                .body(ex.getMessage());
        }
    }
}
