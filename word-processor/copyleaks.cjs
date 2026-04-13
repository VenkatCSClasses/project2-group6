const { Copyleaks } = require("plagiarism-checker");

const EMAIL_ADDRESS = "georgesebbailey@gmail.com";
const API_KEY = "bada988b-e7c1-4437-8941-b08e21f8842b";
const copyleaks = new Copyleaks();

// Login function
function loginToCopyleaks() {
  return copyleaks.loginAsync(EMAIL_ADDRESS, API_KEY).then(
    (loginResult) => {
      console.log("Login successful!");
      console.log("Access Token:", loginResult.access_token);
      return loginResult;
    },
    (err) => {
      console.error('Login failed:', err);
      throw err;
    }
  );
}

loginToCopyleaks();
