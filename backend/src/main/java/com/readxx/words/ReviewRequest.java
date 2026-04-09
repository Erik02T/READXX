package com.readxx.words;

import jakarta.validation.constraints.NotNull;

public record ReviewRequest(
    @NotNull
    SrsEngine.Rating rating
) {
}
