package com.pulse.controller;

import com.pulse.dto.TodayDtos.TodaySummary;
import com.pulse.service.TodayService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/today")
@RequiredArgsConstructor
public class TodayController {
    private final TodayService service;

    @GetMapping
    TodaySummary get(Authentication authentication) {
        return service.get(authentication.getName());
    }
}
