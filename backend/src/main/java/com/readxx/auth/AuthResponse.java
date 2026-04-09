package com.readxx.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String userId,
    String email,
    String plan,
    long expiresIn
) {
}
