COPYLEAKS_ACCESS_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJtM1dwZkh3bjlHbzFQZ0M5ekhiaUoycXl3MGZwWmdwUi03QUdiODQ4dmJZIn0.eyJleHAiOjE3NzYyNjM1MjEsImlhdCI6MTc3NjA5MDcyMSwianRpIjoib25sdG5hOjZlYmM3OWNlLWIzNDItNzg0NC0wMWY0LTQ3MTE0ZDkyMTk0MyIsImlzcyI6Imh0dHBzOi8vYXV0aC5jb3B5bGVha3MuY29tL3JlYWxtcy9jb3B5bGVha3MiLCJhdWQiOlsiYWktZ2VuZXJhdGVkLXRleHQtYXBpIiwiYXBpLWJhY2tlbmQiXSwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXBpLXVzZXJzIiwic2lkIjoidjVrY0FVVUx4TmdlbEdoeDgzakdnRWs2Iiwic2NvcGUiOiJyb2xlcyBhcGktYmFja2VuZCBhaS1nZW5lcmF0ZWQtdGV4dC1hcGkgb3JnYW5pemF0aW9uIn0.W52FIy0X047fiUV622ZHuTLZ8dWa6nsUVJ59e4_CqdlH6NLMAA7tZ6qu5N-dCxUFVOsppdQappoFT-ybLJtTngoRsD4dEYgpacGbmSkOVe4dd8Pb8INJPlkVaRDEqgV4oYz8KLLJS2zTlOZSdZj6htRxD0sPlH3rEvgQrWfJUEQUwqOLWsELTHU890RSw0qE0ti1RQtJ4pDI_SQTE7BkNrVGEYjQVhlmpGJrALnRLttzb84GoxjlgxfSEfvBW-20hfx5ncmcuok-_RTWLA11VVPh1l7yq0ulipoOOdJM6gpbcuFx6htQdS4wHPCVcx7bsEeApwzRPuimYKZjEZuA8A";

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const token = process.env.COPYLEAKS_ACCESS_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJtM1dwZkh3bjlHbzFQZ0M5ekhiaUoycXl3MGZwWmdwUi03QUdiODQ4dmJZIn0.eyJleHAiOjE3NzYyNjM1MjEsImlhdCI6MTc3NjA5MDcyMSwianRpIjoib25sdG5hOjZlYmM3OWNlLWIzNDItNzg0NC0wMWY0LTQ3MTE0ZDkyMTk0MyIsImlzcyI6Imh0dHBzOi8vYXV0aC5jb3B5bGVha3MuY29tL3JlYWxtcy9jb3B5bGVha3MiLCJhdWQiOlsiYWktZ2VuZXJhdGVkLXRleHQtYXBpIiwiYXBpLWJhY2tlbmQiXSwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXBpLXVzZXJzIiwic2lkIjoidjVrY0FVVUx4TmdlbEdoeDgzakdnRWs2Iiwic2NvcGUiOiJyb2xlcyBhcGktYmFja2VuZCBhaS1nZW5lcmF0ZWQtdGV4dC1hcGkgb3JnYW5pemF0aW9uIn0.W52FIy0X047fiUV622ZHuTLZ8dWa6nsUVJ59e4_CqdlH6NLMAA7tZ6qu5N-dCxUFVOsppdQappoFT-ybLJtTngoRsD4dEYgpacGbmSkOVe4dd8Pb8INJPlkVaRDEqgV4oYz8KLLJS2zTlOZSdZj6htRxD0sPlH3rEvgQrWfJUEQUwqOLWsELTHU890RSw0qE0ti1RQtJ4pDI_SQTE7BkNrVGEYjQVhlmpGJrALnRLttzb84GoxjlgxfSEfvBW-20hfx5ncmcuok-_RTWLA11VVPh1l7yq0ulipoOOdJM6gpbcuFx6htQdS4wHPCVcx7bsEeApwzRPuimYKZjEZuA8A';
if (!token) {
  throw new Error('Set COPYLEAKS_ACCESS_TOKEN in the environment before running.');
}

const scanId = `scan-${Date.now()}`;

async function submitFileScan() {
  const filePath = path.resolve(__dirname, 'wordFiles', 'tempFile.txt');
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString('base64');

  const response = await axios.put(
    `https://api.copyleaks.com/v3/scans/submit/file/${scanId}`,
    {
      base64: base64Content,
      filename: 'tempFile.txt',
      properties: { sandbox: true }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

async function fetchFinalReport() {
  const response = await axios.get(`https://api.copyleaks.com/v3/scans/${scanId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  return response.data;
}

async function pollFinalReport() {
  while (true) {
    const report = await fetchFinalReport();
    const status = report.status || report.scan?.status;
    console.log(`Scan status: ${status}`);
    if (status === 'Completed' || status === 'Failed' || status === 'Aborted') {
      return report;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function run() {
  try {
    console.log('Submitting file scan...');
    const submitResult = await submitFileScan();
    console.log('Submit result:', submitResult);

    console.log('Waiting for final report...');
    const report = await pollFinalReport();

    const outPath = path.resolve(__dirname, 'copyleaks-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Saved final scan report to ${outPath}`);
  } catch (error) {
    if (error.response) {
      console.error('Copyleaks error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

run();