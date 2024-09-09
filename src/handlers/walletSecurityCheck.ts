import { HandlerContext } from "@xmtp/message-kit";
import { GenericRedisClient } from "../lib/redis.js";
import { ethers } from 'ethers';
import axios from 'axios';

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

interface ApprovedContract {
  contractAddress: string;
  tokenSymbol: string;
  approvedAmount: string;
}
interface Transaction {
    to: string;
    from: string;
    hash: string;
    // Add other properties as needed
  }
async function checkApprovedContracts(address: string): Promise<ApprovedContract[]> {
  const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);
  const abi = ["function allowance(address owner, address spender) view returns (uint256)"];
  
  // This is a simplified check. In a real-world scenario, you'd need to check multiple token contracts.
  const tokenAddresses = [
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
  ];

  const approvedContracts: ApprovedContract[] = [];

  for (const tokenAddress of tokenAddresses) {
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    const spenders = await getTopSpenders();

    for (const spender of spenders) {
      const allowance = await contract.allowance(address, spender);
      if (allowance.gt(0)) {
        approvedContracts.push({
          contractAddress: spender,
          tokenSymbol: await getTokenSymbol(tokenAddress),
          approvedAmount: ethers.utils.formatEther(allowance)
        });
      }
    }
  }

  return approvedContracts;
}

async function getTopSpenders(): Promise<string[]> {
  // In a real-world scenario, you'd maintain a list of known spender contracts
  return [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap V3 Router
    '0x1111111254fb6c44bAC0beD2854e76F90643097d'  // 1inch Router
  ];
}

async function getTokenSymbol(tokenAddress: string): Promise<string> {
  const response = await axios.get(`https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress=${tokenAddress}&apikey=${ETHERSCAN_API_KEY}`);
  return response.data.result[0].symbol;
}

async function checkPhishingAttempts(address: string): Promise<boolean> {
  // This is a placeholder. In a real-world scenario, you'd check against a database of known phishing addresses or use an API.
  const response = await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`);
  const recentTransactions = response.data.result.slice(0, 10);
  
  // Check if any recent transactions are to known phishing addresses
  const knownPhishingAddresses = ['0x123...', '0x456...']; // placeholder addresses
  return recentTransactions.some((tx: Transaction) => knownPhishingAddresses.includes(tx.to));
}

const securityTips = [
  "Use a hardware wallet for storing large amounts of cryptocurrency.",
  "Enable two-factor authentication (2FA) on all your crypto accounts.",
  "Never share your private keys or seed phrases with anyone.",
  "Be cautious of phishing attempts. Always double-check URLs and email addresses.",
  "Keep your software and wallets updated to the latest version.",
  "Use unique and strong passwords for each of your accounts.",
  "Be wary of unsolicited offers or messages, especially those promising free crypto.",
  "Regularly review your approved contracts and revoke unnecessary permissions.",
  "Use a separate email address for your crypto accounts.",
  "Consider using a multisig wallet for added security."
];

export async function handleWalletSecurityCheck(
  context: HandlerContext,
  redisClient: GenericRedisClient,
  address: string
): Promise<{ message: string; showMenu: boolean }> {
  try {
    const approvedContracts = await checkApprovedContracts(address);
    const potentialPhishing = await checkPhishingAttempts(address);

    let message = "Wallet Security Check Results:\n\n";

    if (approvedContracts.length > 0) {
      message += "Approved Contracts:\n";
      approvedContracts.forEach(contract => {
        message += `- ${contract.tokenSymbol}: ${contract.approvedAmount} approved for ${contract.contractAddress}\n`;
      });
      message += "\nConsider revoking unnecessary approvals to improve security.\n\n";
    } else {
      message += "No approved contracts found. This is good for security!\n\n";
    }

    if (potentialPhishing) {
      message += "WARNING: Potential phishing activity detected in recent transactions. Please review your transaction history carefully.\n\n";
    } else {
      message += "No potential phishing activity detected in recent transactions.\n\n";
    }

    message += "Security Tips:\n";
    const randomTips = securityTips.sort(() => 0.5 - Math.random()).slice(0, 3);
    randomTips.forEach((tip, index) => {
      message += `${index + 1}. ${tip}\n`;
    });

    return { message, showMenu: true };
  } catch (error) {
    console.error('Error performing wallet security check:', error);
    return { message: "Sorry, there was an error performing the wallet security check. Please try again later.", showMenu: true };
  }
}