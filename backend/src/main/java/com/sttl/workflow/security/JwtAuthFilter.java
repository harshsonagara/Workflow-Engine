package com.sttl.workflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Parses the {@code Authorization: Bearer} JWT (HS256, shared secret from
 * {@code workflow.jwt.secret}) and populates the SecurityContext so
 * {@link ClaimsAccessor} can read user claims.
 *
 * NOT enforced: missing, invalid, or expired tokens pass through
 * unauthenticated — SecurityConfig permits all requests. Flip the
 * authorization rule there when enforcement is wanted.
 */
@Component
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtDecoder decoder; // null → no secret configured, filter is a no-op

    public JwtAuthFilter(@Value("${workflow.jwt.secret:}") String secret) {
        this.decoder = secret.isBlank() ? null
                : NimbusJwtDecoder.withSecretKey(
                        new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256")).build();
        if (this.decoder == null) {
            log.info("workflow.jwt.secret not set — JWT parsing disabled, requests proceed unauthenticated");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (decoder != null && authorization != null && authorization.startsWith("Bearer ")) {
            try {
                Jwt jwt = decoder.decode(authorization.substring(7));
                SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
            } catch (JwtException e) {
                log.debug("Ignoring unparseable JWT (auth not enforced): {}", e.getMessage());
            }
        }
        chain.doFilter(request, response);
    }
}
