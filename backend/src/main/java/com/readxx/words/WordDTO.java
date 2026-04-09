package com.readxx.words;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class WordDTO {

    private UUID id;

    @NotBlank
    @Size(max = 200)
    private String word;

    private String context;

    private String sourceUrl;

    @Size(max = 5)
    private String lang;

    private Float srsEase;
    private Integer srsInterval;
    private Integer srsRepetitions;
    private LocalDate nextReview;
    private Instant savedAt;
    private Instant updatedAt;

    public static WordDTO fromEntity(Word entity) {
        WordDTO dto = new WordDTO();
        dto.setId(entity.getId());
        dto.setWord(entity.getWord());
        dto.setContext(entity.getContext());
        dto.setSourceUrl(entity.getSourceUrl());
        dto.setLang(entity.getLang());
        dto.setSrsEase(entity.getSrsEase());
        dto.setSrsInterval(entity.getSrsInterval());
        dto.setSrsRepetitions(entity.getSrsRepetitions());
        dto.setNextReview(entity.getNextReview());
        dto.setSavedAt(entity.getSavedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public Float getSrsEase() {
        return srsEase;
    }

    public void setSrsEase(Float srsEase) {
        this.srsEase = srsEase;
    }

    public Integer getSrsInterval() {
        return srsInterval;
    }

    public void setSrsInterval(Integer srsInterval) {
        this.srsInterval = srsInterval;
    }

    public Integer getSrsRepetitions() {
        return srsRepetitions;
    }

    public void setSrsRepetitions(Integer srsRepetitions) {
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
