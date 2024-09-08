// src/lib/transactionHistory.ts

import axios from 'axios';
import { ethers } from 'ethers';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  input: string;
  timeStamp: string; // Changed from timestamp to timeStamp
}

interface TransactionSummary {
  type: string;
  count: number;
}

async function getTransactionHistory(address: string, chain: string): Promise<Transaction[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  
  try {
    const response = await axios.get(apiUrl);
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      return response.data.result.slice(0, 10); // Get the 10 most recent transactions
    } else {
      console.error('Unexpected API response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

function categorizeTransaction(transaction: Transaction): string {
  if (transaction.input !== '0x') {
    return 'Contract Interaction';
  } else if (transaction.from.toLowerCase() === transaction.to.toLowerCase()) {
    return 'Self Transfer';
  } else if (transaction.value === '0') {
    return 'Zero Value Transfer';
  } else {
    return 'Token Transfer';
  }
}

function summarizeTransactions(transactions: Transaction[]): TransactionSummary[] {
  const summary: { [key: string]: number } = {};
  
  transactions.forEach(tx => {
    const type = categorizeTransaction(tx);
    summary[type] = (summary[type] || 0) + 1;
  });
  
  return Object.entries(summary).map(([type, count]) => ({ type, count }));
}

export async function getWalletTransactionHistory(address: string, chain: string): Promise<string> {
  try {
    const transactions = await getTransactionHistory(address, chain);
    
    if (transactions.length === 0) {
      return `No recent transactions found for ${address}.`;
    }
    
    const summary = summarizeTransactions(transactions);
    
    let response = `Recent transactions for ${address}:\n\n`;
    
    transactions.forEach((tx, index) => {
      const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleString();
      const value = ethers.utils.formatEther(tx.value);
      response += `${index + 1}. ${date}\n`;
      response += `   Type: ${categorizeTransaction(tx)}\n`;
      response += `   Value: ${value} ETH\n`;
      response += `   To: ${tx.to}\n`;
      response += `   Hash: ${tx.hash.slice(0, 10)}...\n\n`;
    });
    
    response += 'Transaction Summary:\n';
    summary.forEach(item => {
      response += `${item.type}: ${item.count}\n`;
    });
    
    return response;
  } catch (error) {
    console.error('Error in getWalletTransactionHistory:', error);
    return 'Unable to fetch transaction history at this time. Please try again later.';
  }
}