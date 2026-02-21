import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from 'jose';
import { expect, test } from './fixtures';

test.describe('JWT Token Local Verification', () => {
  test('should verify JWT token locally without backend request', async ({
    useAuthenticatedApi,
    useHttp,
  }) => {
    const { api, user } = await useAuthenticatedApi();
    const http = useHttp();

    // Step 1: Get JWT token from backend
    const sessionResponse = await api.getSession();
    const jwtToken =
      sessionResponse.headers['set-auth-jwt'] || sessionResponse.headers['Set-Auth-Jwt'];
    expect(jwtToken).toBeDefined();

    // Step 2: Get JWKS (public keys) from backend
    // This is a one-time fetch - keys can be cached indefinitely
    const jwksResponse = await http.get('/auth/jwks');
    expect(jwksResponse.status).toBe(200);
    expect(jwksResponse.data.keys).toBeDefined();

    // Step 3: Verify JWT token LOCALLY without any backend request
    // This is the key advantage of JWT - stateless verification
    const JWKS = createRemoteJWKSet(new URL('http://localhost:13000/auth/jwks'));

    const { payload } = await jwtVerify(jwtToken, JWKS, {
      issuer: 'http://localhost:13000', // Should match BASE_URL
      audience: 'http://localhost:13000', // Should match BASE_URL
    });

    // Step 4: Extract user information from verified token
    expect(payload).toBeDefined();
    expect(payload.sub).toBeDefined(); // Subject (user ID)
    expect(payload.email).toBe(user.email); // User email from token payload
    expect(payload.id).toBeDefined(); // User ID

    // Token is verified - no backend request needed!
    // This allows:
    // - Microservices to verify tokens independently
    // - CDN/Edge functions to verify tokens
    // - Offline verification (with cached JWKS)
    // - Better scalability (no database lookup needed)
  });

  test('should verify JWT token with locally cached JWKS', async ({
    useAuthenticatedApi,
    useHttp,
  }) => {
    const { api, user } = await useAuthenticatedApi();
    const http = useHttp();

    // Get JWT token
    const sessionResponse = await api.getSession();
    const jwtToken =
      sessionResponse.headers['set-auth-jwt'] || sessionResponse.headers['Set-Auth-Jwt'];
    expect(jwtToken).toBeDefined();

    // Fetch JWKS once and cache it locally
    const jwksResponse = await http.get('/auth/jwks');
    const cachedJWKS = jwksResponse.data;

    // Create local JWKS from cached data
    const JWKS = createLocalJWKSet({
      keys: cachedJWKS.keys,
    });

    // Verify token using cached JWKS (no network request!)
    const { payload } = await jwtVerify(jwtToken, JWKS, {
      issuer: 'http://localhost:13000',
      audience: 'http://localhost:13000',
    });

    expect(payload.email).toBe(user.email);
    expect(payload.sub).toBeDefined();

    // This demonstrates that once JWKS is cached,
    // you can verify tokens completely offline
  });

  test('should extract user data from JWT payload without backend', async ({
    useAuthenticatedApi,
  }) => {
    const { api, user } = await useAuthenticatedApi();

    // Get JWT token
    const sessionResponse = await api.getSession();
    const jwtToken =
      sessionResponse.headers['set-auth-jwt'] || sessionResponse.headers['Set-Auth-Jwt'];
    expect(jwtToken).toBeDefined();

    // Decode JWT payload without verification (for demonstration)
    // In production, always verify the token!
    const parts = jwtToken.split('.');
    expect(parts.length).toBe(3);

    // Decode payload (base64url)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<
      string,
      unknown
    >;

    // Extract user information
    expect(payload.email).toBe(user.email);
    expect(payload.id).toBeDefined();
    expect(payload.sub).toBeDefined();

    // Note: This is just decoding, not verification!
    // Always verify the signature using JWKS in production
  });

  test('should fail to verify expired or invalid JWT token', async ({ useAuthenticatedApi }) => {
    const { api } = await useAuthenticatedApi();

    // Get valid JWT token
    const sessionResponse = await api.getSession();
    const jwtToken =
      sessionResponse.headers['set-auth-jwt'] || sessionResponse.headers['Set-Auth-Jwt'];
    expect(jwtToken).toBeDefined();

    // Create JWKS
    const JWKS = createRemoteJWKSet(new URL('http://localhost:13000/auth/jwks'));

    // Try to verify with wrong issuer (should fail)
    await expect(
      jwtVerify(jwtToken, JWKS, {
        issuer: 'https://wrong-issuer.com',
        audience: 'http://localhost:13000',
      })
    ).rejects.toThrow();

    // Try to verify with wrong audience (should fail)
    await expect(
      jwtVerify(jwtToken, JWKS, {
        issuer: 'http://localhost:13000',
        audience: 'https://wrong-audience.com',
      })
    ).rejects.toThrow();

    // Try to verify invalid token (should fail)
    await expect(
      jwtVerify('invalid.jwt.token', JWKS, {
        issuer: 'http://localhost:13000',
        audience: 'http://localhost:13000',
      })
    ).rejects.toThrow();
  });
});
