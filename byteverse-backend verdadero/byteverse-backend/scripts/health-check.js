const baseUrl = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function main() {
  try {
    const response = await fetch(`${baseUrl}/health/services`, { signal: AbortSignal.timeout(10000) });
    const report = await response.json();
    console.log(`Gateway: ${report.gateway}`);
    console.log(`Servicios saludables: ${report.healthyServices}/${report.totalServices}`);
    for (const service of report.services || []) console.log(`- ${service.service}: ${service.status}`);
    if (!response.ok || report.gateway !== 'healthy') process.exitCode = 1;
  } catch (error) {
    console.error(`No se pudo consultar ${baseUrl}: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
