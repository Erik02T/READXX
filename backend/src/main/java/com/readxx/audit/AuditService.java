package com.readxx.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * ✓ Structured audit logging — JSON format, no sensitive data, server-side only.
 * Logs: auth events, security alerts, AI usage, rate limiting, data operations.
 */
@Service
public class AuditService {

    private static final Logger AUDIT_LOG = LoggerFactory.getLogger("audit");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * ✓ Log successful authentication
     */
    public void logAuthLogin(String userId, String ipHash) {
        log("AUTH_LOGIN", userId, ipHash);
    }

    /**
     * ✓ Log failed authentication attempt
     */
    public void logAuthLoginFailed(String email, String ipHash, int attemptNumber) {
        log("AUTH_LOGIN_FAILED", null, ipHash,
            new AuditDetail("email", "REDACTED"),
            new AuditDetail("attempt", String.valueOf(attemptNumber)));
    }

    /**
     * ✓ Log security alert — token reuse detected
     */
    public void logSecurityAlert(String type, String userId, String familyId) {
        log("SECURITY_ALERT", userId, null,
            new AuditDetail("type", type),
            new AuditDetail("familyId", familyId));
    }

    /**
     * ✓ Log rate limit violation
     */
    public void logRateLimitHit(String feature, String userId, long dailyTotal) {
        log("RATE_LIMIT_HIT", userId, null,
            new AuditDetail("feature", feature),
            new AuditDetail("daily_total", String.valueOf(dailyTotal)));
    }

    /**
     * ✓ Log TTS usage — metadata only (never log text content)
     */
    public void logTtsRequest(String userId, int charCount, String voice, boolean cacheHit, long latencyMs) {
        log("TTS_REQUEST", userId, null,
            new AuditDetail("charCount", String.valueOf(charCount)),
            new AuditDetail("voice", voice),
            new AuditDetail("cacheHit", String.valueOf(cacheHit)),
            new AuditDetail("latencyMs", String.valueOf(latencyMs)));
    }

    /**
     * ✓ Log OCR submission
     */
    public void logOcrSubmitted(String userId, String jobId, int bytes) {
        log("OCR_SUBMITTED", userId, null,
            new AuditDetail("jobId", jobId),
            new AuditDetail("bytes", String.valueOf(bytes)));
    }

    /**
     * ✓ Log user account deletion (GDPR)
     */
    public void logUserDeleted(String userId) {
        log("USER_DELETED", userId, null,
            new AuditDetail("requestedAt", Instant.now().toString()));
    }

    /**
     * ✓ Log plan upgrade
     */
    public void logPlanUpgrade(String userId, String fromPlan, String toPlan) {
        log("PLAN_UPGRADED", userId, null,
            new AuditDetail("from", fromPlan),
            new AuditDetail("to", toPlan));
    }

    /**
     * ✓ Core logging method
     */
    private void log(String event, String userId, String ipHash, AuditDetail... details) {
        try {
            AuditEvent auditEvent = new AuditEvent(event, userId, ipHash, Arrays.asList(details));
            AUDIT_LOG.info("{}", MAPPER.writeValueAsString(auditEvent));
        } catch (Exception e) {
            AUDIT_LOG.error("Failed to serialize audit event: {}", event, e);
        }
    }

    /**
     * Immutable audit event record
     */
    private record AuditEvent(
        String event,
        String userId,
        String ipHash,
        List<AuditDetail> details
    ) {}

    private record AuditDetail(String key, String value) {}
}
