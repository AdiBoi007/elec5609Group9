package com.pulse.controller;

import com.pulse.dto.ConsentDtos.ConsentRequest;
import com.pulse.dto.ConsentDtos.ConsentStatus;
import com.pulse.service.ConsentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/consent") @RequiredArgsConstructor
public class ConsentController {
    private final ConsentService consent;

    @PutMapping("/privacy") ConsentStatus acceptPrivacy(Authentication auth, @Valid @RequestBody ConsentRequest request) { return consent.acceptPrivacy(auth.getName(), request.version()); }
    @PutMapping("/ai") ConsentStatus grantAi(Authentication auth, @Valid @RequestBody ConsentRequest request) { return consent.grantAi(auth.getName(), request.version()); }
    @DeleteMapping("/ai") @ResponseStatus(HttpStatus.NO_CONTENT) void revokeAi(Authentication auth) { consent.revokeAi(auth.getName()); }
}
