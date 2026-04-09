package com.readxx.sync;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/sync")
@PreAuthorize("isAuthenticated()")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/push")
    public PushResponse push(@Valid @RequestBody PushRequest request) {
        UUID userId = currentUserId();
        List<SyncService.SyncChange> changes = request.changes().stream()
            .map(change -> new SyncService.SyncChange(
                change.entity(),
                change.operation(),
                change.payload(),
                change.localId(),
                change.updatedAt()))
            .toList();

        return new PushResponse(syncService.processPush(userId, changes));
    }

    @GetMapping("/pull")
    public SyncService.PullResponse pull(@RequestParam(name = "since", defaultValue = "0") long since) {
        UUID userId = currentUserId();
        return syncService.buildPull(userId, since);
    }

    private UUID currentUserId() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    public record PushRequest(
        @NotEmpty List<@Valid SyncChangeRequest> changes
    ) {
    }

    public record SyncChangeRequest(
        @NotBlank
        @Pattern(regexp = "word|history")
        String entity,

        @NotBlank
        @Pattern(regexp = "create|update|delete")
        String operation,

        Map<String, Object> payload,
        Long localId,
        Long updatedAt
    ) {
    }

    public record PushResponse(List<SyncService.PushResult> changes) {
    }
}

