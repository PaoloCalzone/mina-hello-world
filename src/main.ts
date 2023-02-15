import { Square } from './Square.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
} from 'snarkyjs';

await isReady;

console.log('SnarkyJS loaded');

const useProof = false;
const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);
const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];
const { privateKey: senderKey, publicKey: senderAccount } =
  Local.testAccounts[1];

// Create a public/private key pair. The public key is our address and where we will deploy to

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

// create an instance of Square - and deploy it to zkAppAddress
const zkAppInstance = new Square(zkAppAddress);
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
});
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

// get the initial state of Square after deployment
const num0 = zkAppInstance.num.get();
console.log('state after deployment', num0.toString());

// update the state of Square with a transaction

const txn1 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update(Field(9));
});

await txn1.prove();
await txn1.sign([senderKey]).send();

const num1 = zkAppInstance.num.get();
console.log('state after update', num1.toString());

// test a transaction that should fail

try {
  const txn2 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update(Field(17));
  });
  await txn2.prove();
  await txn2.sign([senderKey]).send();
} catch (ex: any) {
  console.log(ex.message);
}
const num2 = zkAppInstance.num.get();
console.log('state after transaction 2:', num2.toString());

// send a transaction to show the correct update

try {
  const txn3 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update(Field(81));
  });
  await txn3.prove();
  await txn3.sign([senderKey]).send();
} catch (ex: any) {
  console.log(ex.message);
}
const num3 = zkAppInstance.num.get();
console.log('state after transaction 3:', num3.toString());

// shutdown the snarkyjs worker

console.log('Shutting down');

await shutdown();
