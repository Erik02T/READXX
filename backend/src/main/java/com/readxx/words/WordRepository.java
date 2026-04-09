package com.readxx.words;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WordRepository extends JpaRepository<Word, UUID> {

    List<Word> findByUserIdAndLangAndNextReviewLessThanEqual(UUID userId, String lang, LocalDate today);

    Page<Word> findByUserIdOrderBySavedAtDesc(UUID userId, Pageable pageable);

    long countByUserId(UUID userId);

    Optional<Word> findByIdAndUserId(UUID id, UUID userId);

    List<Word> findByUserIdAndNextReviewLessThanEqual(UUID userId, LocalDate today);

    Page<Word> findByUserIdAndLangOrderBySavedAtDesc(UUID userId, String lang, Pageable pageable);

    List<Word> findByUserIdAndUpdatedAtAfter(UUID userId, Instant since);
}
