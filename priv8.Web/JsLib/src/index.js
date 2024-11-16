import * as LitJsSdk from '@lit-protocol/lit-node-client';
import * as ethers from 'ethers';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitAccessControlConditionResource, LitAbility, createSiweMessageWithRecaps, generateAuthSig } from "@lit-protocol/auth-helpers";

const API_BASE_URL = 'http://localhost:8000';

const bucketName = 'test123';

class Lit {
  litNodeClient;
  chain;

  constructor(chain = 'scrollSepolia') {
    this.chain = chain;
  }

  async connect() {
    this.litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: "datil-dev",
      debug: true
    });
    await this.litNodeClient.connect();
    console.log('✅ Lit Protocol Client connected!');
  }

  async createCapacityDelegationAuthSig(){    
    const walletWithCapacityCredit = new ethers.Wallet(
      "xxx",
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    let contractClient = new LitContracts({
      signer: walletWithCapacityCredit,
      network: LitNetwork.Datil,
    });

    await contractClient.connect();
    // this identifier will be used in delegation requests. 
    const { capacityTokenIdStr } = await contractClient.mintCapacityCreditsNFT({
      requestsPerKilosecond: 80,
      // requestsPerDay: 14400,
      // requestsPerSecond: 10,
      daysUntilUTCMidnightExpiration: 2,
    });

    const { capacityDelegationAuthSig } =
      await this.litNodeClient.createCapacityDelegationAuthSig({
        uses: '100000',
        dAppOwnerWallet: walletWithCapacityCredit,
        capacityTokenId: capacityTokenIdStr,
        //test accounts
        delegateeAddresses: ["0xe67bEE5cf3f48504FECEA83dd463889DDDD04bDD"],
      });

    alert(`Capacity token ID: ${capacityTokenIdStr}`);
    alert(`Capacity delegation auth sig: ${capacityDelegationAuthSig}`);
  }

  async getSessionSigs(){
    // Connect to the wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const walletAddress = await signer.getAddress();
    console.log("Connected account:", walletAddress);
 
    // Get the latest blockhash
    const latestBlockhash = await this.litNodeClient.getLatestBlockhash();
 
    // Define the authNeededCallback function
    const authNeededCallback = async(params) => {
      if (!params.uri) {
        throw new Error("uri is required");
      }
      if (!params.expiration) {
        throw new Error("expiration is required");
      }
 
      if (!params.resourceAbilityRequests) {
        throw new Error("resourceAbilityRequests is required");
      }
  
      // Create the SIWE message
      const toSign = await createSiweMessageWithRecaps({
        uri: params.uri,
        expiration: params.expiration,
        resources: params.resourceAbilityRequests,
        walletAddress: walletAddress,
        nonce: latestBlockhash,
        litNodeClient: this.litNodeClient,
      });
 
      // Generate the authSig
      const authSig = await generateAuthSig({
        signer: signer,
        toSign,
      });
 
      return authSig;
    }
 
    // Define the Lit resource
    const litResource = new LitAccessControlConditionResource('*');

    const capacityDelegationAuthSig = {
      "sig": "0xcd5ac300bfbd5da82314ee13a98532de9920711cf2e17d47a1ab55de6399d759693d6f21103204b91c8c38c9a66ffd7739b695e8eaec283b30adc1b216471f411c",
      "derivedVia": "web3.eth.personal.sign",
      "signedMessage": "localhost wants you to sign in with your Ethereum account:\n0xe67bEE5cf3f48504FECEA83dd463889DDDD04bDD\n\nThis is a test statement.  You can put anything you want here. I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://55698'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0xba1cb89f27f2b65e23abe3d35b92841ac54d531d1c6ca4c3360abdbe05f21b81\nIssued At: 2024-11-16T02:53:23.079Z\nExpiration Time: 2024-11-23T02:53:23.062Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vNTU2OTgiOnsiQXV0aC9BdXRoIjpbeyJkZWxlZ2F0ZV90byI6WyJlNjdiRUU1Y2YzZjQ4NTA0RkVDRUE4M2RkNDYzODg5RERERDA0YkREIl0sIm5mdF9pZCI6WyI1NTY5OCJdLCJ1c2VzIjoiMTAwMDAwIn1dfX0sInByZiI6W119",
      "address": "0xe67bEE5cf3f48504FECEA83dd463889DDDD04bDD"
    };

    // Get the session signatures
    const sessionSigs = await this.litNodeClient.getSessionSigs({
        chain: this.chain,
        resourceAbilityRequests: [
            {
                resource: litResource,
                ability: LitAbility.AccessControlConditionDecryption,
            },
        ],
        authNeededCallback,
        capacityDelegationAuthSig,
    });
    return sessionSigs;
 }
}

// Create a singleton instance
const litInstance = new Lit();

export async function uploadTestJson() {
  const status = document.getElementById('status');
  const bucketName = 'test123';

  try {
    // Connect to Lit Protocol
    await litInstance.connect();

    // Create test data
    const data = {
      message: 'This is a test JSON file for Akave storage'.repeat(3),
      timestamp: new Date().toISOString(),
      randomData: Array(50)
        .fill(0)
        .map(() => Math.random()),
      padding: 'X'.repeat(100),
    };

    // Create test data
    const dataToEncrypt = JSON.stringify(data);

    // Define Access Control Conditions
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'scrollSepolia',
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '1000000000000000', // 0.001 ETH in Wei
        },
      },
    ];

    // Encrypt the data using Lit Protocol
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        dataToEncrypt
      },
      litInstance.litNodeClient
    );

    // Prepare data for upload
    const encryptedData = { ciphertext, dataToEncryptHash, accessControlConditions };

    // Check if bucket exists and create if it doesn't
    try {
      const bucketsResponse = await fetch(`${API_BASE_URL}/buckets`);
      const bucketsData = await bucketsResponse.json();
      const bucketExists = bucketsData.data.some(bucket => bucket.Name === bucketName);

      if (!bucketExists) {
        const bodyContent = JSON.stringify({ bucketName });
        console.log('Creating bucket:', bucketName);
        await fetch(`${API_BASE_URL}/buckets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: bodyContent,
        });
      } else {
        console.log('Bucket already exists:', bucketName);
      }
    } catch (error) {
      console.error('Error managing bucket:', error);
      throw error; // Propagate error since this is a critical operation
    }

    // Create form data for file upload
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(encryptedData, null, 2)], {
      type: 'application/json',
    });
    const fileName = `encrypted_test_${Date.now()}.json`;
    formData.append('file', blob, fileName);

    // Upload encrypted file
    const response = await fetch(
      `${API_BASE_URL}/buckets/${bucketName}/files`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    status.textContent = 'Encrypted file uploaded successfully!';
    console.log('✅ Upload completed');

    // Store fileName for later retrieval
    localStorage.setItem('lastFileName', fileName);
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    console.error('❌ Full error:', error);
  }
}

export async function getLastUpload() {
  const status = document.getElementById('status');
  const fileName = localStorage.getItem('lastFileName');

  if (!fileName) {
    status.textContent = 'No file has been uploaded yet';
    return;
  }

  try {
    await litInstance.connect();

    // Fetch the encrypted file
    const response = await fetch(
      `${API_BASE_URL}/buckets/${bucketName}/files/${fileName}/download`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }
    const encryptedData = await response.json();
    console.log('✅ Download completed');

    const { ciphertext, dataToEncryptHash, accessControlConditions } = encryptedData;

    const sessionSigs = await litInstance.getSessionSigs();

    const decryptedString = await LitJsSdk.decryptToString(
      {
        accessControlConditions,
        chain: litInstance.chain,
        ciphertext,
        dataToEncryptHash,
        sessionSigs,
      },
      litInstance.litNodeClient,
    );
    
    const decryptedData = JSON.parse(decryptedString);
    console.log('✅ Decrypted Data:', decryptedData);

    status.textContent = 'File downloaded and decrypted successfully!';
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    console.error('❌ Full error:', error);
  }
}
