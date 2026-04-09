package com.readxx.history;

import com.readxx.auth.User;
import com.readxx.auth.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/history")
@PreAuthorize("isAuthenticated()")
public class HistoryController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final HistoryRepository historyRepository;
    private final UserRepository userRepository;

    public HistoryController(HistoryRepository historyRepository, UserRepository userRepository) {
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<HistoryResponse> saveHistory(@Valid @RequestBody SaveHistoryRequest request) {
        UUID userId = currentUserId();
        User user = loadUser(userId);
        LocalDate today = LocalDate.now();

        historyRepository.upsertByUserUrlAndVisitedAt(
            UUID.randomUUID(),
            userId,
            request.url().trim(),
            trimOrNull(request.title()),
            trimOrNull(request.domain()),
            Math.max(0, request.charsRead() == null ? 0 : request.charsRead()),
            Math.max(0, request.timeSpentSeconds() == null ? 0 : request.timeSpentSeconds()),
            today
        );

        History persisted = historyRepository.findByUserIdAndUrlAndVisitedAt(userId, request.url().trim(), today)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to persist history row."));

        if (!isPremium(user)) {
            LocalDate cutoff = LocalDate.now().minusDays(6);
            historyRepository.deleteByUserIdAndVisitedAtBefore(userId, cutoff);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(HistoryResponse.fromEntity(persisted));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Page<HistoryResponse> getHistory(
        @RequestParam(name = "page", defaultValue = "0") int page,
        @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        UUID userId = currentUserId();
        Pageable pageable = PageRequest.of(Math.max(DEFAULT_PAGE, page), normalizeSize(size));
        Page<History> history = historyRepository.findByUserIdOrderByVisitedAtDesc(userId, pageable);
        List<HistoryResponse> items = history.getContent().stream().map(HistoryResponse::fromEntity).toList();
        return new PageImpl<>(items, pageable, history.getTotalElements());
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public HistoryStatsResponse getStats() {
        UUID userId = currentUserId();
        HistoryRepository.HistoryStatsView stats = historyRepository.statsQuery(userId);

        long totalChars = stats == null || stats.getTotalChars() == null ? 0L : stats.getTotalChars();
        long weeklyChars = calculateWeeklyChars(userId);
        int streak = calculateStreak(userId);
        List<DomainStat> topDomains = historyRepository.findTopDomains(userId).stream()
            .map(domain -> new DomainStat(domain.getDomain(), domain.getTotalChars() == null ? 0L : domain.getTotalChars()))
            .toList();

        return new HistoryStatsResponse(totalChars, streak, weeklyChars, topDomains);
    }

    private long calculateWeeklyChars(UUID userId) {
        LocalDate weeklyCutoff = LocalDate.now().minusDays(8);
        return historyRepository.findByUserIdAndVisitedAtAfter(userId, weeklyCutoff).stream()
            .mapToLong(History::getCharsRead)
            .sum();
    }

    private int calculateStreak(UUID userId) {
        LocalDate cutoff = LocalDate.now().minusDays(365);
        Set<LocalDate> visitedDays = historyRepository.findByUserIdAndVisitedAtAfter(userId, cutoff).stream()
            .map(History::getVisitedAt)
            .filter(java.util.Objects::nonNull)
            .collect(java.util.stream.Collectors.toSet());

        int streak = 0;
        LocalDate cursor = LocalDate.now();
        while (visitedDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private User loadUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private boolean isPremium(User user) {
        return user.getPlan() != null && "premium".equalsIgnoreCase(user.getPlan().trim());
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String trimOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    public record SaveHistoryRequest(
        @NotBlank String url,
        String title,
        String domain,
        @Min(0) Integer charsRead,
        @Min(0) Integer timeSpentSeconds
    ) {
    }

    public record HistoryResponse(
        UUID id,
        String url,
        String title,
        String domain,
        int charsRead,
        int timeSpentSeconds,
        LocalDate visitedAt
    ) {
        static HistoryResponse fromEntity(History history) {
            return new HistoryResponse(
                history.getId(),
                history.getUrl(),
                history.getTitle(),
                history.getDomain(),
                history.getCharsRead(),
                history.getTimeSpentS(),
                history.getVisitedAt()
            );
        }
    }

    public record DomainStat(String domain, long charsRead) {
    }

    public record HistoryStatsResponse(
        long totalChars,
        int streak,
        long weeklyChars,
        List<DomainStat> topDomains
    ) {
    }
}

