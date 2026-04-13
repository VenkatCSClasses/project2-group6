const { CopyleaksNaturalLanguageSubmissionModel } = require('plagiarism-checker');

function logSuccess(response) {
   console.log('Success', response);
   console.log('AI Score:', response.summary.ai*100, '%');
}

function logError(error) {
   console.error('Error', error);
}
async function detect(loginResult) {
   const copyleaks = new Copyleaks();
   const sampleText =
       "Lions are social animals, living in groups called prides, typically consisting of several females, their offspring, and a few males. Female lions are the primary hunters, working together to catch prey. Lions are known for their strength, teamwork, and complex social structures.";
   const submission = new CopyleaksNaturalLanguageSubmissionModel(sampleText);
   submission.sandbox = true;

   copyleaks.aiDetectionClient
       .submitNaturalTextAsync(loginResult, Date.now() + 1, submission)
       .then((response) => {
           logSuccess(response);
       })
       .catch((error) => {
           logError(error);
       });
}

async function main() {
   const loginResult = await login();
   await detect(loginResult);
}

main()