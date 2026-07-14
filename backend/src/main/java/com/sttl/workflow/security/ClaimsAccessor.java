package com.sttl.workflow.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Extracts user context, preferring JWT claims (populated by {@link JwtAuthFilter}
 * when a valid Bearer token is sent) and falling back to X-Test-* headers.
 * Auth is not enforced — both sources are optional.
 */
@Component
public class ClaimsAccessor {

    @Autowired(required = false)
    private HttpServletRequest request;

    public Integer getUserId()       { return intValue("userId", "X-Test-User-Id"); }
    public String  getRoleCode()     { return value("role", "X-Test-Role"); }
    public String  getUserName()     { return value("userName", "X-Test-User-Name"); }
    public String  getEmail()        { return value("email", "X-Test-Email"); }

    /** JWT claim first, request header as fallback. */
    private String value(String claimName, String headerName) {
        Jwt jwt = currentJwt();
        if (jwt != null && jwt.hasClaim(claimName)) {
            Object claim = jwt.getClaims().get(claimName);
            if (claim != null) return String.valueOf(claim);
        }
        return request != null ? request.getHeader(headerName) : null;
    }

    private Integer intValue(String claimName, String headerName) {
        String v = value(claimName, headerName);
        if (v == null) return null;
        try { return Integer.parseInt(v); } catch (NumberFormatException ignored) { return null; }
    }

    private Jwt currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof Jwt jwt ? jwt : null;
    }
}
