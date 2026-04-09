package com.readxx.words;

import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
public class SrsEngine {

    public enum Rating {
        AGAIN,
        HARD,
        GOOD,
        EASY
    }

    public Word review(Word word, Rating rating) {
        float ease = Math.max(1.3f, word.getSrsEase());
        int interval = Math.max(1, word.getSrsInterval());
        int repetitions = Math.max(0, word.getSrsRepetitions());

        switch (rating) {
            case AGAIN -> {
                ease = Math.max(1.3f, ease - 0.2f);
                interval = 1;
                repetitions = 0;
            }
            case HARD -> {
                ease = Math.max(1.3f, ease - 0.15f);
                interval = Math.max(1, (int) (interval * 1.2));
                repetitions++;
            }
            case GOOD -> {
                interval = Math.max(1, (int) (interval * ease));
                repetitions++;
            }
            case EASY -> {
                ease = Math.min(4.0f, ease + 0.1f);
                interval = Math.max(1, (int) (interval * ease * 1.3));
                repetitions++;
            }
            default -> throw new IllegalArgumentException("Unsupported review rating: " + rating);
        }

        word.setSrsEase(ease);
        word.setSrsInterval(interval);
        word.setSrsRepetitions(repetitions);
        word.setNextReview(LocalDate.now().plusDays(interval));
        return word;
    }
}
