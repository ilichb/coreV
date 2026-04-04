const algosdk = require('algosdk');

// Reemplaza con tu mnemotécnica real
const mnemonic = "near basket song season tourist spice transfer beauty ghost social section rotate planet donate maze vendor orange major sniff hover potato express now absorb aerobic";

// Configuración LocalNet
const algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const algodServer = 'http://localhost';
const algodPort = 4001;

const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

async function main() {
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const fromAddr = algosdk.encodeAddress(account.publicKey);
  const toAddr = fromAddr; // auto pago
  console.log('From address:', fromAddr);
  
  const params = await algodClient.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: fromAddr,
    to: toAddr,
    amount: 1000,
    note: new TextEncoder().encode('Test'),
    suggestedParams: params,
  });
  const signedTxn = txn.signTxn(account.sk);
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  console.log('Tx ID:', txId);
  
  // Confirmación
  let confirmed = false;
  for (let i = 0; i < 10; i++) {
    const info = await algodClient.pendingTransactionInformation(txId).do();
    if (info['confirmed-round']) {
      console.log('Confirmed in round', info['confirmed-round']);
      confirmed = true;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!confirmed) console.log('Not confirmed after 10s');
}
main().catch(console.error);
