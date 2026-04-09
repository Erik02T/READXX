package com.readxx.words;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/words")
@PreAuthorize("isAuthenticated()")
public class WordController {

    private final WordService wordService;

    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    @PostMapping
    public ResponseEntity<WordDTO> saveWord(@Valid @RequestBody WordDTO request) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        WordDTO saved = wordService.saveWord(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<Page<WordDTO>> getWords(
        @RequestParam(required = false) String lang,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return ResponseEntity.ok(wordService.getWords(userId, lang, page, size));
    }

    @GetMapping("/due")
    public ResponseEntity<List<WordDTO>> getDueWords(@RequestParam(required = false) String lang) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return ResponseEntity.ok(wordService.getDueWords(userId, lang));
    }

    @PatchMapping("/{id}/review")
    public ResponseEntity<WordDTO> reviewWord(
        @PathVariable("id") UUID wordId,
        @Valid @RequestBody ReviewRequest request
    ) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        WordDTO updated = wordService.reviewWord(userId, wordId, request.rating());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWord(@PathVariable("id") UUID wordId) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        wordService.deleteWord(userId, wordId);
        return ResponseEntity.noContent().build();
    }
}
