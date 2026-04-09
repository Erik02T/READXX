package com.readxx.sync;

import com.readxx.history.History;
import com.readxx.history.HistoryRepository;
import com.readxx.words.Word;
import com.readxx.words.WordRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SyncService {

    private final WordRepository wordRepository;
    private final HistoryRepository historyRepository;

    public SyncService(WordRepository wordRepository, HistoryRepository historyRepository) {
        this.wordRepository = wordRepository;
        this.historyRepository = historyRepository;
    }

    @Transactional
    public List<PushResult> processPush(UUID userId, List<SyncChange> changes) {
        if (changes == null || changes.isEmpty()) {
            return List.of();
        }

        List<PushResult> results = new ArrayList<>();
        for (SyncChange change : changes) {
            String entity = normalize(change.entity());
            if ("word".equals(entity)) {
                results.add(processWordChange(userId, change));
                continue;
            }
            if ("history".equals(entity)) {
                results.add(processHistoryChange(userId, change));
                continue;
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported entity: " + change.entity());
        }
        return results;
    }

    @Transactional(readOnly = true)
    public PullResponse buildPull(UUID userId, long since) {
        Instant sinceInstant = since > 0 ? Instant.ofEpochMilli(since) : Instant.EPOCH;
        LocalDate historyCutoff = sinceInstant.atZone(ZoneOffset.UTC).toLocalDate().minusDays(1);

        List<WordSyncItem> words = wordRepository.findByUserIdAndUpdatedAtAfter(userId, sinceInstant).stream()
            .map(WordSyncItem::fromWord)
            .toList();

        List<HistorySyncItem> history = historyRepository.findByUserIdAndVisitedAtAfter(userId, historyCutoff).stream()
            .map(HistorySyncItem::fromHistory)
            .toList();

        return new PullResponse(words, history, Instant.now().toEpochMilli());
    }

    private PushResult processWordChange(UUID userId, SyncChange change) {
        Map<String, Object> payload = safePayload(change.payload());
        String operation = normalize(change.operation());
        long clientUpdatedAt = change.updatedAt() == null ? 0L : Math.max(0L, change.updatedAt());

        UUID wordId = parseUuid(firstNonNull(payload, "id", "serverId"));
        if ("delete".equals(operation)) {
            if (wordId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Word delete requires an id.");
            }

            Word existing = wordRepository.findByIdAndUserId(wordId, userId).orElse(null);
            if (existing != null && isServerNewer(existing.getUpdatedAt(), clientUpdatedAt)) {
                return new PushResult(change.localId(), existing.getId().toString(), toEpochMillis(existing.getUpdatedAt()));
            }

            if (existing != null) {
                wordRepository.delete(existing);
            }
            return new PushResult(change.localId(), wordId.toString(), Instant.now().toEpochMilli());
        }

        Word word = wordId == null
            ? new Word()
            : wordRepository.findByIdAndUserId(wordId, userId).orElseGet(Word::new);

        if (word.getId() != null && isServerNewer(word.getUpdatedAt(), clientUpdatedAt)) {
            return new PushResult(change.localId(), word.getId().toString(), toEpochMillis(word.getUpdatedAt()));
        }

        if (word.getId() == null) {
            word.setId(wordId == null ? UUID.randomUUID() : wordId);
        }
        word.setUserId(userId);

        String payloadWord = trimOrNull(asString(payload.get("word")));
        if (payloadWord != null) {
            word.setWord(payloadWord);
        }
        if (!StringUtils.hasText(word.getWord())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Word text is required.");
        }

        if (payload.containsKey("context")) {
            word.setContext(trimOrNull(asString(payload.get("context"))));
        }
        if (payload.containsKey("sourceUrl") || payload.containsKey("source_url")) {
            word.setSourceUrl(trimOrNull(asString(firstNonNull(payload, "sourceUrl", "source_url"))));
        }
        if (payload.containsKey("lang")) {
            word.setLang(trimOrNull(asString(payload.get("lang"))));
        }

        Float srsEase = asFloat(firstNonNull(payload, "srsEase", "srs_ease"));
        if (srsEase != null) {
            word.setSrsEase(srsEase);
        }
        Integer srsInterval = asInteger(firstNonNull(payload, "srsInterval", "srs_interval"));
        if (srsInterval != null) {
            word.setSrsInterval(srsInterval);
        }
        Integer srsRepetitions = asInteger(firstNonNull(payload, "srsRepetitions", "srs_repetitions"));
        if (srsRepetitions != null) {
            word.setSrsRepetitions(srsRepetitions);
        }

        LocalDate nextReview = asLocalDate(firstNonNull(payload, "nextReview", "next_review"));
        if (nextReview != null) {
            word.setNextReview(nextReview);
        }

        Word saved = wordRepository.save(word);
        return new PushResult(change.localId(), saved.getId().toString(), toEpochMillis(saved.getUpdatedAt()));
    }

    private PushResult processHistoryChange(UUID userId, SyncChange change) {
        Map<String, Object> payload = safePayload(change.payload());
        String operation = normalize(change.operation());
        long clientUpdatedAt = change.updatedAt() == null ? 0L : Math.max(0L, change.updatedAt());

        UUID historyId = parseUuid(firstNonNull(payload, "id", "serverId"));
        String url = trimOrNull(asString(payload.get("url")));
        LocalDate visitedAt = asLocalDate(firstNonNull(payload, "visitedAt", "visited_at"));

        if ("delete".equals(operation)) {
            if (historyId != null) {
                History existing = historyRepository.findByIdAndUserId(historyId, userId).orElse(null);
                if (existing != null && isHistoryServerNewer(existing, clientUpdatedAt)) {
                    return new PushResult(change.localId(), existing.getId().toString(), historyUpdatedAtMillis(existing));
                }
                historyRepository.deleteByIdAndUserId(historyId, userId);
                return new PushResult(change.localId(), historyId.toString(), Instant.now().toEpochMilli());
            }

            if (!StringUtils.hasText(url) || visitedAt == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "History delete requires id or (url + visitedAt).");
            }

            History existing = historyRepository.findByUserIdAndUrlAndVisitedAt(userId, url, visitedAt).orElse(null);
            if (existing != null && isHistoryServerNewer(existing, clientUpdatedAt)) {
                return new PushResult(change.localId(), existing.getId().toString(), historyUpdatedAtMillis(existing));
            }
            historyRepository.deleteByUserIdAndUrlAndVisitedAt(userId, url, visitedAt);
            return new PushResult(change.localId(), existing == null ? null : existing.getId().toString(), Instant.now().toEpochMilli());
        }

        if (!StringUtils.hasText(url)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "History url is required.");
        }
        if (visitedAt == null) {
            visitedAt = LocalDate.now();
        }

        History existing = historyRepository.findByUserIdAndUrlAndVisitedAt(userId, url, visitedAt).orElse(null);
        if (existing != null && isHistoryServerNewer(existing, clientUpdatedAt)) {
            return new PushResult(change.localId(), existing.getId().toString(), historyUpdatedAtMillis(existing));
        }

        UUID upsertId = existing != null
            ? existing.getId()
            : historyId == null ? UUID.randomUUID() : historyId;

        int charsRead = nonNegative(asInteger(firstNonNull(payload, "charsRead", "chars_read")), 0);
        int timeSpentS = nonNegative(asInteger(firstNonNull(payload, "timeSpentSeconds", "timeSpentS", "time_spent_s")), 0);

        historyRepository.upsertByUserUrlAndVisitedAt(
            upsertId,
            userId,
            url,
            trimOrNull(asString(payload.get("title"))),
            trimOrNull(asString(payload.get("domain"))),
            charsRead,
            timeSpentS,
            visitedAt
        );

        History saved = historyRepository.findByUserIdAndUrlAndVisitedAt(userId, url, visitedAt)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to persist history sync row."));

        return new PushResult(change.localId(), saved.getId().toString(), historyUpdatedAtMillis(saved));
    }

    private boolean isServerNewer(Instant serverUpdatedAt, long clientUpdatedAt) {
        return serverUpdatedAt != null
            && clientUpdatedAt > 0
            && serverUpdatedAt.toEpochMilli() > clientUpdatedAt;
    }

    private boolean isHistoryServerNewer(History history, long clientUpdatedAt) {
        return clientUpdatedAt > 0 && historyUpdatedAtMillis(history) > clientUpdatedAt;
    }

    private long historyUpdatedAtMillis(History history) {
        LocalDate visitedAt = history.getVisitedAt() == null ? LocalDate.now() : history.getVisitedAt();
        return visitedAt.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    }

    private long toEpochMillis(Instant instant) {
        return instant == null ? Instant.now().toEpochMilli() : instant.toEpochMilli();
    }

    private Map<String, Object> safePayload(Map<String, Object> payload) {
        return payload == null ? Map.of() : payload;
    }

    private Object firstNonNull(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            if (payload.containsKey(key) && payload.get(key) != null) {
                return payload.get(key);
            }
        }
        return null;
    }

    private UUID parseUuid(Object value) {
        String text = asString(value);
        if (!StringUtils.hasText(text)) {
            return null;
        }
        try {
            return UUID.fromString(text.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid UUID value: " + text);
        }
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid integer value: " + value);
        }
    }

    private int nonNegative(Integer value, int fallback) {
        if (value == null) {
            return fallback;
        }
        return Math.max(0, value);
    }

    private Float asFloat(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.floatValue();
        }
        try {
            return Float.parseFloat(value.toString().trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid float value: " + value);
        }
    }

    private LocalDate asLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return Instant.ofEpochMilli(number.longValue()).atZone(ZoneOffset.UTC).toLocalDate();
        }

        String text = value.toString().trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        if (text.chars().allMatch(Character::isDigit)) {
            return Instant.ofEpochMilli(Long.parseLong(text)).atZone(ZoneOffset.UTC).toLocalDate();
        }

        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(text).atZone(ZoneOffset.UTC).toLocalDate();
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date value: " + text);
            }
        }
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private String trimOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    public record SyncChange(
        String entity,
        String operation,
        Map<String, Object> payload,
        Long localId,
        Long updatedAt
    ) {
    }

    public record PushResult(
        Long localId,
        String serverId,
        long updatedAt
    ) {
    }

    public record PullResponse(
        List<WordSyncItem> words,
        List<HistorySyncItem> history,
        long serverTime
    ) {
    }

    public record WordSyncItem(
        UUID id,
        UUID userId,
        String word,
        String context,
        String sourceUrl,
        String lang,
        float srsEase,
        int srsInterval,
        int srsRepetitions,
        LocalDate nextReview,
        Instant savedAt,
        long updatedAt
    ) {
        static WordSyncItem fromWord(Word word) {
            return new WordSyncItem(
                word.getId(),
                word.getUserId(),
                word.getWord(),
                word.getContext(),
                word.getSourceUrl(),
                word.getLang(),
                word.getSrsEase(),
                word.getSrsInterval(),
                word.getSrsRepetitions(),
                word.getNextReview(),
                word.getSavedAt(),
                word.getUpdatedAt() == null ? 0L : word.getUpdatedAt().toEpochMilli()
            );
        }
    }

    public record HistorySyncItem(
        UUID id,
        UUID userId,
        String url,
        String title,
        String domain,
        int charsRead,
        int timeSpentSeconds,
        LocalDate visitedAt,
        long updatedAt
    ) {
        static HistorySyncItem fromHistory(History history) {
            LocalDate date = history.getVisitedAt() == null ? LocalDate.now() : history.getVisitedAt();
            return new HistorySyncItem(
                history.getId(),
                history.getUserId(),
                history.getUrl(),
                history.getTitle(),
                history.getDomain(),
                history.getCharsRead(),
                history.getTimeSpentS(),
                history.getVisitedAt(),
                date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
            );
        }
    }
}

