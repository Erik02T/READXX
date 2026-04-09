package com.readxx.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.readxx.config.ReadxxJwtProperties;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    private final AuthService authService;
    private final ReadxxJwtProperties jwtProperties;
    private final ConcurrentMap<String, AttemptWindow> loginAttempts = new ConcurrentHashMap<>();

    public AuthController(AuthService authService, ReadxxJwtProperties jwtProperties) {
        this.authService = authService;
        this.jwtProperties = jwtProperties;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        String clientIp = resolveClientIp(httpRequest);
        if (isBlocked(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds(clientIp)))
                .build();
        }

        try {
            AuthResponse response = authService.login(request);
            loginAttempts.remove(clientIp);
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(response.refreshToken()).toString())
                .body(response);
        } catch (ResponseStatusException ex) {
            if (HttpStatus.UNAUTHORIZED.equals(ex.getStatusCode())) {
                recordFailedAttempt(clientIp);
            }
            throw ex;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
        @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshCookieToken,
        @Valid @RequestBody(required = false) RefreshRequest refreshRequest
    ) {
        String refreshToken = resolveRefreshToken(refreshCookieToken, refreshRequest, true);
        AuthResponse response = authService.refresh(refreshToken);
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(response.refreshToken()).toString())
            .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshCookieToken,
        @Valid @RequestBody(required = false) RefreshRequest refreshRequest
    ) {
        String refreshToken = resolveRefreshToken(refreshCookieToken, refreshRequest, false);
        if (StringUtils.hasText(refreshToken)) {
            authService.logout(refreshToken);
        }

        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
            .build();
    }

    private String resolveRefreshToken(
        String cookieToken,
        RefreshRequest body,
        boolean required
    ) {
        if (StringUtils.hasText(cookieToken)) {
            return cookieToken;
        }
        if (body != null && StringUtils.hasText(body.refreshToken())) {
            return body.refreshToken();
        }
        if (required) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is required.");
        }
        return null;
    }

    private ResponseCookie refreshCookie(@NonNull String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ofSeconds(jwtProperties.getRefreshTokenExpiry()))
            .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(Duration.ZERO)
            .build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isBlocked(String ipAddress) {
        AttemptWindow attemptWindow = loginAttempts.get(ipAddress);
        if (attemptWindow == null) {
            return false;
        }
        if (Instant.now().isAfter(attemptWindow.startedAt.plus(LOGIN_WINDOW))) {
            loginAttempts.remove(ipAddress, attemptWindow);
            return false;
        }
        return attemptWindow.attempts >= MAX_LOGIN_ATTEMPTS;
    }

    private long retryAfterSeconds(String ipAddress) {
        AttemptWindow attemptWindow = loginAttempts.get(ipAddress);
        if (attemptWindow == null) {
            return 1L;
        }
        long retryAfter = Duration.between(Instant.now(), attemptWindow.startedAt.plus(LOGIN_WINDOW))
            .toSeconds();
        return Math.max(1L, retryAfter);
    }

    private void recordFailedAttempt(String ipAddress) {
        Instant now = Instant.now();
        loginAttempts.compute(ipAddress, (key, existing) -> {
            if (existing == null || now.isAfter(existing.startedAt.plus(LOGIN_WINDOW))) {
                return new AttemptWindow(now, 1);
            }
            return new AttemptWindow(existing.startedAt, existing.attempts + 1);
        });
    }

    private record AttemptWindow(Instant startedAt, int attempts) {
    }
}
