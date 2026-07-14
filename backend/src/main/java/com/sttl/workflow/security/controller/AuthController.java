package com.sttl.workflow.security.controller;

import com.sttl.workflow.common.dto.ApiResponse;
import com.sttl.workflow.security.ClaimsAccessor;
import com.sttl.workflow.security.entity.AppUser;
import com.sttl.workflow.security.repository.AppUserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * Signup / login issuing HS256 JWTs (same shared secret {@code workflow.jwt.secret}
 * that {@link com.sttl.workflow.security.JwtAuthFilter} verifies).
 *
 * Auth is available but NOT enforced — all other endpoints remain open;
 * the token simply supplies user identity to {@link ClaimsAccessor}.
 */
@RestController
@RequestMapping("/workflow-engine-api/auth")
@Tag(name = "Auth", description = "Signup, login, and current-user lookup (JWT issued; enforcement off)")
public class AuthController {

    private static final long TOKEN_TTL_HOURS = 12;

    private final AppUserRepository userRepo;
    private final ClaimsAccessor claimsAccessor;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtEncoder jwtEncoder;

    public AuthController(
            AppUserRepository userRepo,
            ClaimsAccessor claimsAccessor,
            @Value("${workflow.jwt.secret:}") String secret
    ) {
        this.userRepo = userRepo;
        this.claimsAccessor = claimsAccessor;
        this.jwtEncoder = secret.isBlank() ? null
                : new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableSecret<>(
                        new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256")));
    }

    public record SignupRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 2, max = 200) String fullName,
            @NotBlank @Size(min = 8, max = 72) String password) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    public record AuthResponse(String token, Long userId, String email, String fullName, String role) {}

    @PostMapping("/signup")
    @Operation(summary = "Register a new account and return a JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@Valid @RequestBody SignupRequest req) {
        if (userRepo.existsByEmailIgnoreCase(req.email().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        AppUser user = userRepo.save(AppUser.builder()
                .email(req.email().trim().toLowerCase())
                .fullName(req.fullName().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build());
        return ResponseEntity.ok(ApiResponse.success("Account created successfully", toAuthResponse(user)));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate with email/password and return a JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AppUser user = userRepo.findByEmailIgnoreCase(req.email().trim())
                .filter(AppUser::isActive)
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return ResponseEntity.ok(ApiResponse.success("Logged in successfully", toAuthResponse(user)));
    }

    @GetMapping("/me")
    @Operation(summary = "Current user resolved from the Bearer JWT (or X-Test-* headers)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me() {
        Map<String, Object> me = new java.util.LinkedHashMap<>();
        me.put("userId", claimsAccessor.getUserId());
        me.put("userName", claimsAccessor.getUserName());
        me.put("email", claimsAccessor.getEmail());
        me.put("role", claimsAccessor.getRoleCode());
        return ResponseEntity.ok(ApiResponse.success("Current user resolved", me));
    }

    private AuthResponse toAuthResponse(AppUser user) {
        return new AuthResponse(issueToken(user), user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    private String issueToken(AppUser user) {
        if (jwtEncoder == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "JWT signing is not configured — set workflow.jwt.secret");
        }
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getEmail())
                .issuedAt(now)
                .expiresAt(now.plus(TOKEN_TTL_HOURS, ChronoUnit.HOURS))
                .claim("userId", user.getId())
                .claim("userName", user.getFullName())
                .claim("email", user.getEmail())
                .claim("role", user.getRole())
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
