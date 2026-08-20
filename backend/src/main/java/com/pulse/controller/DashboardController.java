package com.pulse.controller;

import com.pulse.dto.DashboardSummary;
import com.pulse.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor
public class DashboardController {
    private final DashboardService service;
    @GetMapping DashboardSummary summary(Authentication authentication) { return service.get(authentication.getName()); }
}
