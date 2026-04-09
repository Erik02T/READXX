package com.readxx.ocr;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * ✓ OCR image upload request with base64 payload.
 */
public record OcrRequest(
    @NotBlank(message = "Image data is required")
    @Size(max = 13_981_013, message = "Image exceeds 10MB limit (base64 encoded)")
    String base64Image
) {
}
