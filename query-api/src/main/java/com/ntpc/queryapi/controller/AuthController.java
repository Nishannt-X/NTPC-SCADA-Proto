package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.JwtAuthResponse;
import com.ntpc.queryapi.dto.LoginRequest;
import com.ntpc.queryapi.security.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final com.ntpc.queryapi.repository.AppUserRepository userRepository;
    private final com.ntpc.queryapi.repository.AppRoleRepository roleRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider,
                          com.ntpc.queryapi.repository.AppUserRepository userRepository,
                          com.ntpc.queryapi.repository.AppRoleRepository roleRepository,
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String jwt = tokenProvider.generateToken(authentication);
            
            List<String> roles = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList());

            com.ntpc.queryapi.entity.AppUser appUser = userRepository.findByUsername(authentication.getName()).orElse(null);
            Boolean isOnShift = appUser != null ? appUser.getIsOnShift() : false;
            Integer assignedShift = appUser != null ? appUser.getAssignedShift() : null;

            return ResponseEntity.ok(new JwtAuthResponse(jwt, authentication.getName(), roles, isOnShift, assignedShift));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody com.ntpc.queryapi.dto.SignupRequest signupRequest) {
        if (userRepository.findByUsername(signupRequest.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username is already taken!");
        }

        com.ntpc.queryapi.entity.AppUser user = new com.ntpc.queryapi.entity.AppUser();
        user.setUsername(signupRequest.getUsername());
        user.setPasswordHash(passwordEncoder.encode(signupRequest.getPassword()));

        String roleName = signupRequest.getRole() != null ? signupRequest.getRole() : "ROLE_OPERATOR";
        java.util.Optional<com.ntpc.queryapi.entity.AppRole> role = roleRepository.findByName(roleName);
        if (role.isPresent()) {
            user.setRoles(java.util.Set.of(role.get()));
        }

        userRepository.save(user);

        return ResponseEntity.ok("User registered successfully");
    }
}
