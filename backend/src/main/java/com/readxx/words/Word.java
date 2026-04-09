package com.readxx.words;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "words")
public class Word {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "word", nullable = false, length = 200)
    private String word;

    @Column(name = "context")
    private String context;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "lang", length = 5)
    private String lang;

    @Column(name = "srs_ease", nullable = false)
    private float srsEase = 2.5f;

    @Column(name = "srs_interval", nullable = false)
    private int srsInterval = 1;

    @Column(name = "srs_repetitions", nullable = false)
    private int srsRepetitions = 0;

    @Column(name = "next_review")
    private LocalDate nextReview;

    @CreationTimestamp
    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (srsEase < 1.3f) {
            srsEase = 2.5f;
        }
        if (srsInterval < 1) {
            srsInterval = 1;
        }
        if (nextReview == null) {
            nextReview = LocalDate.now().plusDays(srsInterval);
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public String getLang() {
        return lang;
    }

    public void setLang(String lang) {
        this.lang = lang;
    }

    public float getSrsEase() {
        return srsEase;
    }

    public void setSrsEase(float srsEase) {
        this.srsEase = srsEase;
    }

    public int getSrsInterval() {
        return srsInterval;
    }

    public void setSrsInterval(int srsInterval) {
        this.srsInterval = srsInterval;
    }

    public int getSrsRepetitions() {
        return srsRepetitions;
    }

    public void setSrsRepetitions(int srsRepetitions) {
        this.srsRepetitions = srsRepetitions;
    }

    public LocalDate getNextReview() {
        return nextReview;
    }

    public void setNextReview(LocalDate nextReview) {
        this.nextReview = nextReview;
    }

    public Instant getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(Instant savedAt) {
        this.savedAt = savedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
