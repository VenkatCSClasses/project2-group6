function createUserRecord(username, password) {
  return {
    username,
    password,
    documents: { writer: [], editor: [] },
  };
}

function registerUser(users, username, password) {
  if (users.some((entry) => entry.username === username)) {
    return {
      ok: false,
      status: 400,
      error: "User already exists",
    };
  }

  return {
    ok: true,
    status: 200,
    user: createUserRecord(username, password),
  };
}

function authenticateUser(users, username, password) {
  const user = users.find((entry) => entry.username === username);

  if (!user) {
    return {
      ok: false,
      status: 400,
      error: "User not found",
    };
  }

  if (user.password !== password) {
    return {
      ok: false,
      status: 400,
      error: "Incorrect password",
    };
  }

  return {
    ok: true,
    status: 200,
    user,
  };
}

module.exports = {
  createUserRecord,
  registerUser,
  authenticateUser,
};