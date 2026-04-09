package com.readxx.history;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HistoryRepository extends JpaRepository<History, UUID> {

    Page<History> findByUserIdOrderByVisitedAtDesc(UUID userId, Pageable pageable);

    List<History> findByUserIdAndVisitedAtAfter(UUID userId, LocalDate cutoff);

    Optional<History> findByIdAndUserId(UUID id, UUID userId);

    Optional<History> findByUserIdAndUrlAndVisitedAt(UUID userId, String url, LocalDate visitedAt);

    @Modifying
    @Query(value = """
        INSERT INTO history (
            id,
            user_id,
            url,
            title,
            domain,
            chars_read,
            time_spent_s,
            visited_at
        )
        VALUES (
            :id,
            :userId,
            :url,
            :title,
            :domain,
            :charsRead,
            :timeSpentS,
            :visitedAt
        )
        ON CONFLICT (user_id, url, visited_at)
        DO UPDATE SET
            title = COALESCE(EXCLUDED.title, history.title),
            domain = COALESCE(EXCLUDED.domain, history.domain),
            chars_read = history.chars_read + EXCLUDED.chars_read,
            time_spent_s = history.time_spent_s + EXCLUDED.time_spent_s
        """, nativeQuery = true)
    void upsertByUserUrlAndVisitedAt(
        @Param("id") UUID id,
        @Param("userId") UUID userId,
        @Param("url") String url,
        @Param("title") String title,
        @Param("domain") String domain,
        @Param("charsRead") int charsRead,
        @Param("timeSpentS") int timeSpentS,
        @Param("visitedAt") LocalDate visitedAt
    );

    @Modifying
    @Query("DELETE FROM History h WHERE h.userId = :userId AND h.visitedAt < :cutoff")
    int deleteByUserIdAndVisitedAtBefore(
        @Param("userId") UUID userId,
        @Param("cutoff") LocalDate cutoff
    );

    @Modifying
    @Query("DELETE FROM History h WHERE h.id = :id AND h.userId = :userId")
    int deleteByIdAndUserId(
        @Param("id") UUID id,
        @Param("userId") UUID userId
    );

    @Modifying
    @Query("DELETE FROM History h WHERE h.userId = :userId AND h.url = :url AND h.visitedAt = :visitedAt")
    int deleteByUserIdAndUrlAndVisitedAt(
        @Param("userId") UUID userId,
        @Param("url") String url,
        @Param("visitedAt") LocalDate visitedAt
    );

    @Query(value = """
        SELECT
            COALESCE(SUM(chars_read), 0) AS totalChars,
            COUNT(DISTINCT visited_at) AS activeDays
        FROM history
        WHERE user_id = :userId
        """, nativeQuery = true)
    HistoryStatsView statsQuery(@Param("userId") UUID userId);

    @Query(value = """
        SELECT
            domain AS domain,
            COALESCE(SUM(chars_read), 0) AS totalChars
        FROM history
        WHERE user_id = :userId
          AND domain IS NOT NULL
          AND domain <> ''
        GROUP BY domain
        ORDER BY totalChars DESC
        LIMIT 5
        """, nativeQuery = true)
    List<DomainStatsView> findTopDomains(@Param("userId") UUID userId);

    interface HistoryStatsView {
        Long getTotalChars();
        Long getActiveDays();
    }

    interface DomainStatsView {
        String getDomain();
        Long getTotalChars();
    }
}

