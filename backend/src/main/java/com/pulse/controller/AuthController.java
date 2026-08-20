package com.pulse.controller;

import com.pulse.dto.AuthDtos.*;
import com.pulse.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    @PostMapping("/register") ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request)); }
    @PostMapping("/login") AuthResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }
    @PostMapping("/password-reset") Map<String, String> reset(@RequestBody Map<String, String> body) { return Map.of("message", "If an account exists, password reset instructions have been sent."); }
}
