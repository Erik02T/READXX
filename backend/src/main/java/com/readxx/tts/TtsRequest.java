package com.readxx.tts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TtsRequest(
    @NotBlank
    @Size(max = 10_000)
    String text,

    @NotBlank
    String voice,

    String model
) {
}
