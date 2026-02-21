import { expect, test } from './fixtures';

test.describe('Better Auth', () => {
  test('should register a new user and then sign in', async ({ useApi }) => {
    const api = await useApi();
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
    };

    // Step 1: Register a new user
    const signUpResponse = await api.signUpWithEmailAndPassword({
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    if (signUpResponse.status !== 200) {
      console.log('Sign up response status:', signUpResponse.status);
      console.log('Sign up response data:', signUpResponse.data);
      console.log('Sign up response headers:', signUpResponse.headers);
    }

    expect(signUpResponse.status).toBe(200);
    expect(signUpResponse.data).toBeDefined();

    // Step 2: Sign in with the same credentials
    const signInResponse = await api.signInEmail({
      email: testUser.email,
      password: testUser.password,
    });

    expect(signInResponse.status).toBe(200);
    expect(signInResponse.data).toBeDefined();

    // Step 3: Verify we can access protected route with session
    // Cookies are automatically managed by the API client
    const sessionResponse = await api.getSession();

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeDefined();
  });

  test('should fail to sign in with wrong password', async ({ useApi }) => {
    const api = await useApi();
    const testUser = {
      email: `test-wrong-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'CorrectPassword123!',
    };

    // First, register a user
    await api.signUpWithEmailAndPassword({
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    // Try to sign in with wrong password
    const signInResponse = await api.signInEmail({
      email: testUser.email,
      password: 'WrongPassword123!',
    });

    expect(signInResponse.status).toBe(401);
  });

  test('should return null session when accessing /auth/get-session without authentication', async ({
    useApi,
  }) => {
    const api = await useApi();
    const sessionResponse = await api.getSession();

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeNull();
  });

  test('should get session via /auth/get-session endpoint', async ({ useApi }) => {
    const api = await useApi();
    const testUser = {
      email: `test-session-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'TestPassword123!',
    };

    // Register and sign in
    await api.signUpWithEmailAndPassword({
      email: testUser.email,
      name: testUser.name,
      password: testUser.password,
    });

    const signInResponse = await api.signInEmail({
      email: testUser.email,
      password: testUser.password,
    });

    expect(signInResponse.status).toBe(200);

    // Verify session by accessing /auth/get-session
    // Cookies are automatically managed by the API client
    const sessionResponse = await api.getSession();

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data).toBeDefined();
  });

  test('should create user, session, and account in database after registration', async ({
    useAuthenticatedApi,
    useDb,
  }) => {
    const { user } = await useAuthenticatedApi();
    const db = useDb();

    // Verify user exists in database
    const dbUser = await db.userRepo.findOne({ where: { email: user.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.email).toBe(user.email);
    expect(dbUser?.name).toBe(user.name);
    expect(dbUser?.emailVerified).toBe(false);

    if (!dbUser) return; // Type guard for TypeScript

    // Verify session exists for this user
    const sessions = await db.sessionRepo.find({ where: { userId: dbUser.id } });
    expect(sessions.length).toBeGreaterThan(0);

    const session = sessions[0];
    expect(session.token).toBeDefined();
    expect(session.expiresAt).toBeDefined();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify credential account exists for this user
    const accounts = await db.accountRepo.find({ where: { userId: dbUser.id } });
    expect(accounts.length).toBeGreaterThan(0);

    const account = accounts[0];
    expect(account.providerId).toBe('credential');
    expect(account.password).toBeDefined(); // Should be hashed
    expect(account.password).not.toBe(user.password); // Should NOT be plain text
  });
});

test.describe('Admin Initialization', () => {
  test('should allow admin user to sign in with credentials from environment', async ({
    useApi,
    useDb,
  }) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Skip test if admin credentials are not configured
    if (!adminEmail || !adminPassword) {
      test.skip();
      return;
    }

    const db = useDb();

    // Verify admin user exists in database
    const adminUser = await db.userRepo.findOne({
      where: { email: adminEmail },
    });

    expect(adminUser).toBeDefined();
    expect(adminUser?.email).toBe(adminEmail);
    expect(adminUser?.name).toBe('Admin');
    expect(adminUser?.emailVerified).toBe(true); // Admin should have verified email
    expect(adminUser?.role).toBe('admin'); // Admin should have admin role

    if (!adminUser) return; // Type guard

    // Verify admin account exists
    const adminAccount = await db.accountRepo.findOne({
      where: {
        userId: adminUser.id,
        providerId: 'credential',
      },
    });

    expect(adminAccount).toBeDefined();
    expect(adminAccount?.password).toBeDefined(); // Should have hashed password
    expect(adminAccount?.password).not.toBe(adminPassword); // Should be hashed, not plain text

    // Sign in with admin credentials
    const api = await useApi();
    const signInResponse = await api.signInEmail({
      email: adminEmail,
      password: adminPassword,
    });

    expect(signInResponse.status).toBe(200);
    expect(signInResponse.data).toBeDefined();

    // Verify session was created and user is admin
    const sessionResponse = await api.getSession();
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.data?.user).toBeDefined();
    expect(sessionResponse.data?.user?.email).toBe(adminEmail);
    expect(sessionResponse.data?.user?.role).toBe('admin');
    expect(sessionResponse.data?.user?.emailVerified).toBe(true);
  });

  test('should fail to sign in with wrong admin password', async ({ useApi }) => {
    const adminEmail = process.env.ADMIN_EMAIL;

    // Skip test if admin credentials are not configured
    if (!adminEmail) {
      test.skip();
      return;
    }

    const api = await useApi();

    // Try to sign in with wrong password
    const signInResponse = await api.signInEmail({
      email: adminEmail,
      password: 'WrongPassword123!',
    });

    expect(signInResponse.status).toBe(401);
  });
});
