package com.readxx.security;

import com.readxx.config.ReadxxCorsProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final ReadxxCorsProperties corsProperties;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, ReadxxCorsProperties corsProperties) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.corsProperties = corsProperties;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ✓ Stateless — JWT replaces session
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // ✓ No CSRF needed for stateless JWT API
            .csrf(AbstractHttpConfigurer::disable)
            // ✓ CORS locked to extension origin only
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/auth/login", "/auth/register", "/auth/refresh").permitAll()
                .requestMatchers(HttpMethod.POST, "/auth/logout").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/ready", "/actuator/health/live").permitAll()
                // ✓ Everything else requires valid JWT
                .anyRequest().authenticated()
            )
            // ✓ No form login, no HTTP Basic — API only
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            // ✓ Security headers
            .headers(h -> h
                .frameOptions(f -> f.deny()))
            .exceptionHandling(exceptions ->
                exceptions.authenticationEntryPoint((request, response, exception) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(resolveAllowedOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of(
            HttpHeaders.AUTHORIZATION,
            HttpHeaders.CONTENT_TYPE,
            HttpHeaders.ACCEPT,
            HttpHeaders.ORIGIN));
        cors.setExposedHeaders(List.of(HttpHeaders.AUTHORIZATION));
        cors.setAllowCredentials(true);
        cors.applyPermitDefaultValues();

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // ✓ BCrypt cost factor 12: ~400ms per hash — fast enough for users, too slow for brute force
        return new BCryptPasswordEncoder(12);
    }

    private List<String> resolveAllowedOrigins() {
        if (corsProperties.getAllowedOrigins() == null) {
            return List.of();
        }

        return corsProperties.getAllowedOrigins().stream()
            .flatMap(originValue -> Arrays.stream(originValue.split(",")))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .distinct()
            .toList();
    }
}
