package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.AppUser;
import com.ntpc.queryapi.repository.AppUserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AppUserRepository userRepository;

    public UserController(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/operators")
    public List<Map<String, Object>> getOperators() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> "ROLE_OPERATOR".equals(r.getName())))
                .map(u -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("username", u.getUsername());
                    m.put("isOnShift", u.getIsOnShift());
                    m.put("assignedShift", u.getAssignedShift());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @PutMapping("/{username}/shift")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<?> toggleShift(@PathVariable String username, @RequestBody Map<String, Integer> body) {
        return userRepository.findByUsername(username)
                .map(user -> {
                    user.setAssignedShift(body.get("assignedShift"));
                    userRepository.save(user);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
