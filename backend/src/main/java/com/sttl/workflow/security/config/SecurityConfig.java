package com.sttl.workflow.security.config;

import com.sttl.workflow.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Security + global CORS configuration for the Workflow Engine API.
 *
 * Auth is WIRED BUT NOT ENFORCED: {@link JwtAuthFilter} parses a Bearer JWT
 * when one is present (populating claims for {@code ClaimsAccessor}), but
 * every request is permitted. To enforce, replace {@code permitAll()} with
 * {@code authenticated()} and whitelist swagger/actuator paths.
 *
 * Uses {@code allowedOriginPatterns("*")} instead of {@code allowedOrigins("*")}
 * to remain compatible with {@code allowCredentials(true)}.
 * Spring disallows the combination of wildcard origin ("*") + allowCredentials,
 * because the browser specification forbids reflecting "*" in the
 * Access-Control-Allow-Origin header when credentials are included.
 * The pattern approach ("*") instructs Spring to echo back the actual
 * request Origin header, which satisfies both the spec and credential support.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                // ponytail: auth not enforced yet — swap permitAll() for authenticated() to turn it on
                .authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .build();
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Echo back the actual request origin — supports credentials without
        // using the literal wildcard ("*") that the spec disallows with credentials.
        config.addAllowedOriginPattern("*");

        // Allow cookies / Authorization headers to be sent cross-origin
        config.setAllowCredentials(true);

        // Standard HTTP methods used by the API
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("PATCH");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");

        // Allow all request headers (including Authorization, Content-Type, etc.)
        config.addAllowedHeader("*");

        // Cache pre-flight response for 1 hour to reduce OPTIONS round-trips
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply CORS policy to every endpoint in the application
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
