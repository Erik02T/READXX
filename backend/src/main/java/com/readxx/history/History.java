package com.readxx.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "history")
public class History {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "url")
    private String url;

    @Column(name = "title")
    private String title;

    @Column(name = "domain", length = 255)
    private String domain;

    @Column(name = "chars_read", nullable = false)
    private int charsRead = 0;

    @Column(name = "time_spent_s", nullable = false)
    private int timeSpentS = 0;

    @Column(name = "visited_at")
    private LocalDate visitedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (visitedAt == null) {
            visitedAt = LocalDate.now();
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

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public int getCharsRead() {
        return charsRead;
    }

    public void setCharsRead(int charsRead) {
        this.charsRead = charsRead;
    }

    public int getTimeSpentS() {
        return timeSpentS;
    }

    public void setTimeSpentS(int timeSpentS) {
        this.timeSpentS = timeSpentS;
    }

    public LocalDate getVisitedAt() {
        return visitedAt;
    }

    public void setVisitedAt(LocalDate visitedAt) {
        this.visitedAt = visitedAt;
    }
}

