"use client";

import {
  EndpointCard, Callout, IC, H2, H3, P, PropTable, CodeBlock,
} from "../../../../components/docs/DocComponents";

export default function ApiAuthPage() {
  return (
    <>
      <P>
        Base path: <IC>/workflow-engine-api/auth</IC>. The engine issues stateless{" "}
        <strong>HS256 JWTs</strong> on signup and login. Send the token on subsequent requests as{" "}
        <IC>Authorization: Bearer &lt;token&gt;</IC> — the engine reads the user&apos;s identity
        (ID, name, email, role) from the token claims and stamps it into task assignments and the
        audit trail.
      </P>

      <Callout type="important">
        Authentication is currently <strong>available but not enforced</strong>. Every endpoint
        works without a token; a valid token simply supplies your identity. When enforcement is
        switched on (a one-line change in <IC>SecurityConfig</IC>), requests without a valid token
        will receive <IC>401 Unauthorized</IC> — integrate the Bearer header now to be ready.
      </Callout>

      {/* ── How auth works ─────────────────────────────────────────────────── */}
      <H2 id="how-it-works">How Authentication Works</H2>
      <P>
        Tokens are signed with the shared secret configured in <IC>workflow.jwt.secret</IC>{" "}
        (environment variable <IC>JWT_SECRET</IC>) and expire after <strong>12 hours</strong>.
        The token carries these claims:
      </P>
      <PropTable
        rows={[
          ["sub",      "string", "Yes", "The user's email address (standard JWT subject)."],
          ["userId",   "number", "Yes", "Internal numeric user ID — used for task assignment matching."],
          ["userName", "string", "Yes", "Display name shown in workflow history entries."],
          ["email",    "string", "Yes", "The user's email address."],
          ["role",     "string", "Yes", "Role code (e.g. user, admin) — used for role-based task queries."],
          ["exp",      "number", "Yes", "Expiry (12 hours after issue). Expired tokens are ignored, not rejected."],
        ]}
      />

      <H3 id="sending-token">Sending the Token</H3>
      <CodeBlock
        language="bash"
        code={`curl http://localhost:8080/workflow-engine-api/workflow-runtime/pending-tasks \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."`}
      />

      <Callout type="note">
        <strong>Development fallback:</strong> without a token you can impersonate any identity by
        sending <IC>X-Test-User-Id</IC>, <IC>X-Test-Role</IC>, <IC>X-Test-User-Name</IC> and{" "}
        <IC>X-Test-Email</IC> headers. When both a JWT and headers are present, the JWT claims win.
      </Callout>

      {/* ── Signup ─────────────────────────────────────────────────────────── */}
      <H2 id="signup">Sign Up</H2>
      <EndpointCard
        method="POST"
        path="/workflow-engine-api/auth/signup"
        title="Register a New Account"
        description="Creates a user account (password stored as a BCrypt hash) and immediately returns a signed JWT so the caller is logged in without a second request."
        requiredData={[
          "email (string) — must be unique, case-insensitive",
          "fullName (string) — 2–200 characters",
          "password (string) — 8–72 characters",
        ]}
        request={`{
  "email":    "jane@company.com",
  "fullName": "Jane Sharma",
  "password": "s3cure-pass!"
}`}
        response={`{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token":    "eyJhbGciOiJIUzI1NiJ9...",
    "userId":   1,
    "email":    "jane@company.com",
    "fullName": "Jane Sharma",
    "role":     "user"
  }
}`}
        errors={[
          { code: "400", cause: "Validation failed — email malformed, name too short, or password shorter than 8 characters." },
          { code: "409", cause: "An account with this email already exists." },
          { code: "503", cause: "JWT signing not configured (workflow.jwt.secret is blank on the server)." },
        ]}
      >
        <H3>cURL</H3>
        <CodeBlock
          language="bash"
          code={`curl -X POST http://localhost:8080/workflow-engine-api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "email":    "jane@company.com",
    "fullName": "Jane Sharma",
    "password": "s3cure-pass!"
  }'`}
        />
      </EndpointCard>

      {/* ── Login ──────────────────────────────────────────────────────────── */}
      <H2 id="login">Log In</H2>
      <EndpointCard
        method="POST"
        path="/workflow-engine-api/auth/login"
        title="Authenticate and Get a Token"
        description="Verifies email + password against the stored BCrypt hash and returns a fresh 12-hour JWT. Inactive accounts are rejected with the same 401 as a wrong password (no account enumeration)."
        requiredData={[
          "email (string)",
          "password (string)",
        ]}
        request={`{
  "email":    "jane@company.com",
  "password": "s3cure-pass!"
}`}
        response={`{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "token":    "eyJhbGciOiJIUzI1NiJ9...",
    "userId":   1,
    "email":    "jane@company.com",
    "fullName": "Jane Sharma",
    "role":     "user"
  }
}`}
        errors={[
          { code: "400", cause: "Validation failed — email or password missing/malformed." },
          { code: "401", cause: "Invalid email or password (also returned for deactivated accounts)." },
          { code: "503", cause: "JWT signing not configured on the server." },
        ]}
      >
        <H3>cURL</H3>
        <CodeBlock
          language="bash"
          code={`curl -X POST http://localhost:8080/workflow-engine-api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "jane@company.com", "password": "s3cure-pass!" }'`}
        />
      </EndpointCard>

      {/* ── Me ─────────────────────────────────────────────────────────────── */}
      <H2 id="me">Current User</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/auth/me"
        title="Resolve the Current User"
        description="Echoes back the identity the engine resolved from your Bearer token (or X-Test-* headers). Useful for verifying the token is being parsed correctly — all fields are null when no identity was supplied."
        response={`{
  "success": true,
  "message": "Current user resolved",
  "data": {
    "userId":   1,
    "userName": "Jane Sharma",
    "email":    "jane@company.com",
    "role":     "user"
  }
}`}
      >
        <H3>cURL</H3>
        <CodeBlock
          language="bash"
          code={`curl http://localhost:8080/workflow-engine-api/auth/me \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."`}
        />
      </EndpointCard>

      {/* ── Error envelope ─────────────────────────────────────────────────── */}
      <H2 id="error-envelope">Error Envelope</H2>
      <P>
        Every error — auth or otherwise — uses the same response envelope with{" "}
        <IC>success: false</IC> and a human-readable <IC>message</IC>. There is no separate error
        schema to handle.
      </P>
      <CodeBlock
        language="json"
        code={`{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}`}
      />
      <PropTable
        rows={[
          ["400", "status", "No", "Validation failure, malformed body, missing parameter, or type mismatch."],
          ["401", "status", "No", "Invalid credentials on /auth/login."],
          ["404", "status", "No", "Resource or endpoint not found."],
          ["409", "status", "No", "Duplicate key — e.g. signup with an existing email."],
          ["422", "status", "No", "Request understood but cannot be processed (e.g. invalid workflow definition)."],
          ["500", "status", "No", "Unexpected server error — safe generic message, details in server logs."],
        ]}
      />
    </>
  );
}
