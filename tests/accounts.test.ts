import { describe, expect, it } from 'vitest';
import authHelpers from '../backend/authHelpers.js';

const { authenticateUser, registerUser } = authHelpers as {
  authenticateUser: typeof import('../backend/authHelpers.js').authenticateUser;
  registerUser: typeof import('../backend/authHelpers.js').registerUser;
};

describe('account helpers', () => {
  it('registers a new user with empty document lists', () => {
    const users: never[] = [];

    const result = registerUser(users, 'alice', 'secret');

    expect(result.ok).toBe(true);
    expect(result.user).toEqual({
      username: 'alice',
      password: 'secret',
      documents: { writer: [], editor: [] },
    });
  });

  it('rejects duplicate usernames and invalid login credentials', () => {
    const users = [{ username: 'alice', password: 'secret' }];

    const duplicate = registerUser(users, 'alice', 'other');
    const missing = authenticateUser(users, 'bob', 'secret');
    const wrongPassword = authenticateUser(users, 'alice', 'wrong');

    expect(duplicate).toMatchObject({ ok: false, status: 400, error: 'User already exists' });
    expect(missing).toMatchObject({ ok: false, status: 400, error: 'User not found' });
    expect(wrongPassword).toMatchObject({ ok: false, status: 400, error: 'Incorrect password' });
  });
});