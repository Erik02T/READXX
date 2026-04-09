package com.readxx.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpHeaders.ORIGIN;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.readxx.ReadxxBackendApplication;
import com.readxx.auth.JwtService;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(
    classes = {ReadxxBackendApplication.class, SecurityIntegrationTest.TestEndpoints.class},
    properties = {
        "readxx.jwt.secret=01234567890123456789012345678901",
        "readxx.jwt.access-token-expiry=900",
        "readxx.jwt.refresh-token-expiry=2592000",
        "readxx.cors.allowed-origins=chrome-extension://allowed123,https://readxx.app",
        "readxx.tts.enabled=false",
        "readxx.translate.enabled=false",
        "spring.autoconfigure.exclude="
            + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
    })
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Test
    void loginRouteIsPublicAtSecurityLayer() throws Exception {
        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    @Test
    void protectedRouteRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/internal/protected"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void validBearerTokenAuthenticatesRequest() throws Exception {
        String token = jwtService.generateAccessToken("user-123", "test@readxx.dev", "free");

        mockMvc.perform(get("/internal/protected")
                .header(AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(content().string("user-123"));
    }

    @Test
    void malformedBearerTokenDoesNotAuthenticate() throws Exception {
        mockMvc.perform(get("/internal/protected")
                .header(AUTHORIZATION, "Bearer not-a-jwt-token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredBearerTokenDoesNotAuthenticate() throws Exception {
        String token = jwtService.generateAccessToken("user-123", "test@readxx.dev", "free", -60);

        mockMvc.perform(get("/internal/protected")
                .header(AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void allowedCorsOriginReceivesAllowOriginHeader() throws Exception {
        mockMvc.perform(options("/internal/protected")
                .header(ORIGIN, "chrome-extension://allowed123")
                .header(ACCESS_CONTROL_REQUEST_METHOD, "GET")
                .header(ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
            .andExpect(status().isOk())
            .andExpect(header().string(ACCESS_CONTROL_ALLOW_ORIGIN, "chrome-extension://allowed123"))
            .andExpect(header().string(ACCESS_CONTROL_ALLOW_HEADERS, Matchers.containsString("Authorization")));
    }

    @Test
    void disallowedCorsOriginDoesNotReceiveAllowOriginHeader() throws Exception {
        mockMvc.perform(options("/internal/protected")
                .header(ORIGIN, "chrome-extension://blocked999")
                .header(ACCESS_CONTROL_REQUEST_METHOD, "GET"))
            .andExpect(status().isForbidden())
            .andExpect(header().doesNotExist(ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Configuration
    static class TestEndpoints {
        @Bean
        ProtectedController protectedController() {
            return new ProtectedController();
        }
    }

    @RestController
    static class ProtectedController {
        @GetMapping("/internal/protected")
        String protectedEndpoint(Authentication authentication) {
            return authentication.getName();
        }
    }
}
