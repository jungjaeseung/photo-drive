const REALM = "Photo Drive Registration";

export function isRegistrationGatePath(path: string): boolean {
  return path === "/login/new" || path === "/api/auth/register";
}

export function isRegistrationBasicAuthConfigured(): boolean {
  const user = process.env.REGISTRATION_BASIC_AUTH_USER?.trim();
  const pass = process.env.REGISTRATION_BASIC_AUTH_PASSWORD;
  return !!(user && pass);
}

function parseBasicAuth(
  header: string | null
): { user: string; pass: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return {
      user: decoded.slice(0, sep),
      pass: decoded.slice(sep + 1),
    };
  } catch {
    return null;
  }
}

export function verifyRegistrationBasicAuth(request: Request): boolean {
  const expectedUser = process.env.REGISTRATION_BASIC_AUTH_USER?.trim();
  const expectedPass = process.env.REGISTRATION_BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  const creds = parseBasicAuth(request.headers.get("authorization"));
  if (!creds) return false;

  return creds.user === expectedUser && creds.pass === expectedPass;
}

export function registrationBasicAuthChallenge(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

export function registrationBasicAuthForbidden(): Response {
  return new Response("Registration is not configured", { status: 503 });
}
