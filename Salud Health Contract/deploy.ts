import { Account, AleoNetworkClient, initThreadPool, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import * as fs from 'fs';

async function main() {
  await initThreadPool();

  const account = new Account({ 
    privateKey: 'APrivateKey1zkpCrUpbkMau9C7UqgLhxhoRu5TEgY6MUvdzTLzobcmDFqt'
  });

  const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  const programManager = new ProgramManager(
    "https://api.explorer.provable.com/v1",
    keyProvider,
    networkClient
  );
  programManager.setAccount(account);

  const programSource = fs.readFileSync('./build/main.aleo', 'utf-8');

  console.log('Deploying salud_health_records_v6.aleo (12 fields = ~360 bytes)...');
  console.log('Fee: ~13 Aleo credits');

  const fee = 13;

  try {
    const txId = await programManager.deploy(programSource, fee, false);
    console.log('Deployment successful!');
    console.log('Transaction ID:', txId);
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

main();
