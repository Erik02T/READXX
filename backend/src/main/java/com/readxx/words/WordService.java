package com.readxx.words;

import com.readxx.auth.User;
import com.readxx.auth.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WordService {

    private static final long FREE_WORD_LIMIT = 500L;
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final WordRepository wordRepository;
    private final UserRepository userRepository;
    private final SrsEngine srsEngine;

    public WordService(
        WordRepository wordRepository,
        UserRepository userRepository,
        SrsEngine srsEngine
    ) {
        this.wordRepository = wordRepository;
        this.userRepository = userRepository;
        this.srsEngine = srsEngine;
    }

    @Transactional
    public WordDTO saveWord(UUID userId, WordDTO request) {
        User user = loadUser(userId);
        enforceFreePlanLimit(user);

        Word word = new Word();
        word.setUserId(userId);
        word.setWord(request.getWord().trim());
        word.setContext(trimOrNull(request.getContext()));
        word.setSourceUrl(trimOrNull(request.getSourceUrl()));
        word.setLang(normalizeLang(request.getLang()));

        if (request.getSrsEase() != null) {
            word.setSrsEase(request.getSrsEase());
        }
        if (request.getSrsInterval() != null) {
            word.setSrsInterval(request.getSrsInterval());
        }
        if (request.getSrsRepetitions() != null) {
            word.setSrsRepetitions(request.getSrsRepetitions());
        }
        if (request.getNextReview() != null) {
            word.setNextReview(request.getNextReview());
        }

        Word saved = wordRepository.save(word);
        return WordDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<WordDTO> getWords(UUID userId, String lang, int page, int size) {
        Pageable pageable = PageRequest.of(
            Math.max(DEFAULT_PAGE, page),
            normalizePageSize(size));

        Page<Word> words;
        String normalizedLang = normalizeLang(lang);
        if (StringUtils.hasText(normalizedLang)) {
            words = wordRepository.findByUserIdAndLangOrderBySavedAtDesc(userId, normalizedLang, pageable);
        } else {
            words = wordRepository.findByUserIdOrderBySavedAtDesc(userId, pageable);
        }

        List<WordDTO> items = words.getContent().stream().map(WordDTO::fromEntity).toList();
        return new PageImpl<>(items, pageable, words.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<WordDTO> getDueWords(UUID userId, String lang) {
        LocalDate today = LocalDate.now();
        String normalizedLang = normalizeLang(lang);

        List<Word> words = StringUtils.hasText(normalizedLang)
            ? wordRepository.findByUserIdAndLangAndNextReviewLessThanEqual(userId, normalizedLang, today)
            : wordRepository.findByUserIdAndNextReviewLessThanEqual(userId, today);

        return words.stream().map(WordDTO::fromEntity).toList();
    }

    @Transactional
    public WordDTO reviewWord(UUID userId, UUID wordId, SrsEngine.Rating rating) {
        Word word = loadOwnedWord(userId, wordId);
        Word updated = srsEngine.review(word, rating);
        Word saved = wordRepository.save(updated);
        return WordDTO.fromEntity(saved);
    }

    @Transactional
    public void deleteWord(UUID userId, UUID wordId) {
        Word word = loadOwnedWord(userId, wordId);
        wordRepository.delete(word);
    }

    private User loadUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private void enforceFreePlanLimit(User user) {
        String plan = user.getPlan() == null ? "free" : user.getPlan().trim().toLowerCase();
        if (!"premium".equals(plan) && wordRepository.countByUserId(user.getId()) >= FREE_WORD_LIMIT) {
            throw new ResponseStatusException(
                HttpStatus.PAYMENT_REQUIRED,
                "Free plan word limit reached (500). Upgrade to premium.");
        }
    }

    private Word loadOwnedWord(UUID userId, UUID wordId) {
        return wordRepository.findByIdAndUserId(wordId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Word not found."));
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String normalizeLang(String lang) {
        String normalized = trimOrNull(lang);
        if (normalized == null) {
            return null;
        }
        return normalized.length() > 5 ? normalized.substring(0, 5) : normalized;
    }

    private String trimOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
