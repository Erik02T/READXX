package com.readxx.auth;

import com.readxx.config.ReadxxJwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final ReadxxJwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtService(ReadxxJwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = createSigningKey(jwtProperties.getSecret());
    }

    public String generateAccessToken(String userId, String email, String plan) {
        return generateAccessToken(userId, email, plan, jwtProperties.getAccessTokenExpiry());
    }

    public String generateAccessToken(
        String userId,
        String email,
        String plan,
        long expiresInSeconds
    ) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expiresInSeconds);

        return Jwts.builder()
            .subject(userId)
            .claim("email", email)
            .claim("plan", plan)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact();
    }

    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }

    public Claims validateToken(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public String extractUserId(String token) {
        return validateToken(token).getSubject();
    }

    private SecretKey createSigningKey(String secret) {
        try {
            return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        } catch (WeakKeyException ex) {
            throw new IllegalStateException(
                "JWT_SECRET must be at least 32 characters long for HS256.",
                ex);
        }
    }
}
