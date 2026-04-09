package com.readxx.config;

import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * ✓ Distributed rate limiting with Bucket4j + Redis.
 * Global rate limit: 200 requests per 60 seconds per IP.
 * Works across multiple backend instances.
 */
@Configuration
public class RateLimitConfig {

    /**
     * ✓ Global rate limiter interceptor
     */
    @Bean
    public WebMvcConfigurer webMvcConfigurer(GlobalRateLimiter globalRateLimiter) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(@NonNull InterceptorRegistry registry) {
                registry.addInterceptor(new RateLimitInterceptor(globalRateLimiter))
                    .addPathPatterns("/**");
            }
        };
    }

    /**
     * ✓ Global rate limiter — 200 requests/minute per IP.
     */
    @Component
    public static class GlobalRateLimiter {
        private final StringRedisTemplate redisTemplate;
        private static final int REQUESTS_PER_MINUTE = 200;

        public GlobalRateLimiter(StringRedisTemplate redisTemplate) {
            this.redisTemplate = redisTemplate;
        }

        public boolean isAllowed(String ipAddress) {
            String key = "ratelimit:global:" + ipAddress;
            Long current = redisTemplate.opsForValue().increment(key);

            if (current != null && current == 1) {
                // First request in this window, set expiry to 1 minute
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }

            return current != null && current <= REQUESTS_PER_MINUTE;
        }

        public Long getRemainingRequests(String ipAddress) {
            String key = "ratelimit:global:" + ipAddress;
            Long current = redisTemplate.opsForValue().increment(key);
            if (current != null) {
                redisTemplate.opsForValue().decrement(key);
                return Math.max(0L, (long) REQUESTS_PER_MINUTE - current + 1);
            }
            return (long) REQUESTS_PER_MINUTE;
        }
    }

    /**
     * ✓ HTTP interceptor for global rate limiting
     */
    public static class RateLimitInterceptor implements HandlerInterceptor {
        private final GlobalRateLimiter rateLimiter;

        public RateLimitInterceptor(GlobalRateLimiter rateLimiter) {
            this.rateLimiter = rateLimiter;
        }

        @Override
        public boolean preHandle(@NonNull jakarta.servlet.http.HttpServletRequest request,
                                @NonNull jakarta.servlet.http.HttpServletResponse response,
                                @NonNull Object handler) throws Exception {
            String clientIp = getClientIp(request);

            if (!rateLimiter.isAllowed(clientIp)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.addHeader("Retry-After", String.valueOf(60));
                response.addHeader("X-RateLimit-Limit", String.valueOf(200));
                response.addHeader("X-RateLimit-Remaining", "0");
                response.getWriter().write("{\"error\":\"RATE_LIMIT_EXCEEDED\"}");
                return false;
            }

            Long remaining = rateLimiter.getRemainingRequests(clientIp);
            response.addHeader("X-RateLimit-Limit", String.valueOf(200));
            response.addHeader("X-RateLimit-Remaining", String.valueOf(remaining));

            return true;
        }

        private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
            // ✓ Try X-Forwarded-For if behind proxy (in production, validate proxy IP)
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isEmpty()) {
                return forwarded.split(",")[0].trim();
            }

            String clientIp = request.getHeader("X-Real-IP");
            if (clientIp != null && !clientIp.isEmpty()) {
                return clientIp;
            }

            return request.getRemoteAddr();
        }
    }
}
