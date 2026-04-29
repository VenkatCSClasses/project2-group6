import { describe, expect, it } from 'vitest';
import authHelpers from '../backend/authHelpers.js';

const { authenticateUser, registerUser } = authHelpers as {
  authenticateUser: typeof import('../backend/authHelpers.js').authenticateUser;
  registerUser: typeof import('../backend/authHelpers.js').registerUser;
};

describe('registerUser', () => {
  it('creates a new user with empty document lists', () => {
    const result = registerUser([], 'alice', 'secret');

    expect(result.ok).toBe(true);
    expect(result.user).toEqual({
      username: 'alice',
      password: 'secret',
      documents: { writer: [], editor: [] },
    });
  });

  it('rejects a duplicate username', () => {
    const users = [{ username: 'alice', password: 'secret' }];

    expect(registerUser(users, 'alice', 'newpass')).toMatchObject({
      ok: false,
      status: 400,
      error: 'User already exists',
    });
  });

  it('treats usernames as case-sensitive — Alice and alice are different accounts', () => {
    const users = [{ username: 'alice', password: 'secret' }];

    const result = registerUser(users, 'Alice', 'pass');
    expect(result.ok).toBe(true);
  });

  it('succeeds when the user list is empty', () => {
    const result = registerUser([], 'newuser', 'pass123');
    expect(result.ok).toBe(true);
    expect(result.user?.username).toBe('newuser');
  });
});

describe('authenticateUser', () => {
  it('returns the user object on valid credentials', () => {
    const user = { username: 'alice', password: 'secret', documents: { writer: [], editor: [] } };

    const result = authenticateUser([user], 'alice', 'secret');

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.user).toBe(user);
  });

  it('returns User not found when username does not exist', () => {
    expect(authenticateUser([], 'nobody', 'pass')).toMatchObject({
      ok: false,
      status: 400,
      error: 'User not found',
    });
  });

  it('returns Incorrect password for a wrong password', () => {
    const users = [{ username: 'alice', password: 'correct' }];

    expect(authenticateUser(users, 'alice', 'wrong')).toMatchObject({
      ok: false,
      status: 400,
      error: 'Incorrect password',
    });
  });

  it('treats passwords as case-sensitive', () => {
    const users = [{ username: 'alice', password: 'Secret' }];

    expect(authenticateUser(users, 'alice', 'secret')).toMatchObject({
      ok: false,
      status: 400,
      error: 'Incorrect password',
    });
  });

  it('treats usernames as case-sensitive — Alice is not alice', () => {
    const users = [{ username: 'alice', password: 'pass' }];

    expect(authenticateUser(users, 'Alice', 'pass')).toMatchObject({
      ok: false,
      status: 400,
      error: 'User not found',
    });
  });
});
