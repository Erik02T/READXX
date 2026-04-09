# READXX Security Baseline (Production)

Use this file as a release gate for every new feature and architecture change.

## 1) Extension Security Checklist

- [ ] `manifest.json` keeps CSP at `script-src 'self'; object-src 'none'` with no remote scripts.
- [ ] Content scripts never render untrusted HTML (`innerHTML`, `dangerouslySetInnerHTML`, `document.write` forbidden).
- [ ] All text crossing content-script boundary is sanitized and length-limited.
- [ ] URLs are normalized (`http/https` only), sensitive params removed before storage/sync.
- [ ] Floating toolbar remains in Shadow DOM isolation.
- [ ] Runtime messages are validated by type and field in background before processing.
- [ ] Message sender is verified (`sender.id === chrome.runtime.id`), with per-surface allowlist.
- [ ] Expensive operations (`TTS_PLAY`, `TRANSLATE`, `EXPLAIN`, `OCR_REQUEST`) are rate-limited client-side as defense-in-depth.
- [ ] No API keys or secret logic is shipped in extension bundle.

## 2) Backend Security Checklist (Spring Boot)

- [ ] Stateless JWT auth with short-lived access token (recommended: 15 min max).
- [ ] Refresh token rotation + token family revocation on reuse.
- [ ] Strict DTO validation (`@Valid`, Bean Validation annotations) on every write endpoint.
- [ ] Per-user + per-IP rate limiting for auth, OCR, TTS, and AI endpoints.
- [ ] CORS restricted to extension origin (`chrome-extension://<id>`) + production web app origin.
- [ ] AI calls are backend-proxied only; no direct client-to-provider calls.
- [ ] Structured logs exclude secrets, raw prompts, raw OCR payloads, and tokens.
- [ ] Security headers enabled (HSTS, X-Content-Type-Options, Referrer-Policy, frame protections).

## 3) AI Security Checklist

- [ ] Provider API keys stored only in backend secret manager / env, never in extension.
- [ ] AI endpoints enforce user quotas and request-size caps.
- [ ] Abuse controls in place: burst + daily limits, anomaly detection, and auto-throttling.
- [ ] Prompt/response logging stores metadata only (char count, latency, status), not raw user content.

## 4) Data Security Checklist

- [ ] Sensitive fields in PostgreSQL encrypted at rest (column-level for high sensitivity).
- [ ] IndexedDB stores minimal necessary data; private URL params stripped before write.
- [ ] Sync payloads validated on server and tied to authenticated `user_id`.
- [ ] Audit trail for account/data deletion actions (without sensitive payload bodies).

## 5) OCR Security Checklist

- [ ] Accept image uploads only (magic-byte verification + MIME allowlist).
- [ ] File size, dimensions, and decompression-bomb guards enforced.
- [ ] OCR queue protected with Redis rate limits and max queue depth fail-safe.
- [ ] OCR workers run isolated and delete source images immediately after processing.

## 6) Compliance / ToS Checklist

- [ ] Processing is user-initiated and limited to visible page content.
- [ ] No background crawling or site-wide scraping behavior.
- [ ] No redistribution/storage of full third-party page content.
- [ ] Privacy policy discloses AI processing, retention, and deletion/export rights.

## 7) Advanced Protections Checklist

- [ ] Security feature flags for gradual rollout and safe rollback.
- [ ] Immutable audit logs for auth events, quota events, and privilege changes.
- [ ] Abuse-detection alerts (spikes, brute-force, token-reuse, OCR queue flooding).
- [ ] Incident runbook defines triage, key rotation, user notification, and containment steps.

---

## Spring Security Config Suggestions (Code-Level)

### SecurityFilterChain (JWT + headers + CORS)

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable()) // token-based APIs
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))
      .headers(h -> h
        .xssProtection(x -> x.disable()) // modern browsers rely on CSP
        .contentTypeOptions(Customizer.withDefaults())
        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
        .httpStrictTransportSecurity(hsts -> hsts
          .includeSubDomains(true)
          .maxAgeInSeconds(31536000))
      )
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/auth/login", "/auth/refresh", "/health").permitAll()
        .requestMatchers(HttpMethod.POST, "/ocr/**", "/tts/**", "/translate", "/explain").authenticated()
        .anyRequest().authenticated()
      )
      .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));

    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOriginPatterns(List.of(
      "chrome-extension://*",
      "https://readxx.app"
    ));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
    c.setExposedHeaders(List.of("X-RateLimit-Remaining", "Retry-After"));
    c.setAllowCredentials(false);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", c);
    return source;
  }
}
```

### Strict request validation (DTOs)

```java
public record TranslateRequest(
  @NotBlank @Size(max = 4000) String text,
  @NotBlank @Pattern(regexp = "^[a-zA-Z-]{2,16}$") String sourceLang,
  @NotBlank @Pattern(regexp = "^[a-zA-Z-]{2,16}$") String targetLang
) {}
```

```java
@RestController
@RequestMapping("/translate")
public class TranslateController {
  @PostMapping
  public ResponseEntity<String> translate(@Valid @RequestBody TranslateRequest req) {
    // proxy to AI provider here (never from client)
    return ResponseEntity.ok("...");
  }
}
```

### Rate limiting filter (Redis-backed)

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final StringRedisTemplate redis;

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String key = "rl:" + req.getRequestURI() + ":" + clientIp(req);
    Long count = redis.opsForValue().increment(key);
    if (count != null && count == 1) {
      redis.expire(key, Duration.ofMinutes(1));
    }
    if (count != null && count > 120) {
      res.setStatus(429);
      res.setHeader("Retry-After", "60");
      return;
    }
    chain.doFilter(req, res);
  }
}
```

---

## Threat Model Summary (READXX)

| Threat | Primary Control | Residual Risk |
|---|---|---|
| API key exposure | Backend-only AI proxy + secret manager + rotation | Build pipeline secret leak |
| Content-script XSS | Strict text-only rendering + message validation + Shadow DOM | Malicious text prompt abuse |
| JWT replay/theft | Short access TTL + refresh rotation + reuse detection | Stolen device with active session |
| OCR abuse | File/type/size validation + queue throttling + worker isolation | Coordinated distributed abuse |
| TTS cost explosion | Per-user quotas + per-IP rate limits + anomaly alerts | Legitimate high-volume premium usage |
| Data leak (history/vocab) | URL sanitization + minimum-retention + encrypted DB columns | Insider misuse / misconfigured backup |
| IDOR on sync APIs | `user_id` scoped queries + server-side ownership checks | Logic regression in new endpoints |
| Compliance violations | User-initiated processing only + no redistribution architecture | Misuse through future feature drift |

