import axios from 'axios';
import { getAccountBalance } from './balance.js';

interface TokenBalance {
  symbol: string;
  balance: number;
  price: number;
}

interface PortfolioAnalytics {
  totalValue: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  diversification: {
    topHoldings: { symbol: string; percentage: number }[];
    pieChart: { symbol: string; value: number }[];
  };
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
  };
}

async function getPriceHistory(symbols: string[], days: number): Promise<Record<string, number[]>> {
  const priceHistory: Record<string, number[]> = {};
  for (const symbol of symbols) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${days}`);
      priceHistory[symbol] = response.data.prices.map((price: number[]) => price[1]);
    } catch (error) {
      console.error(`Failed to fetch price history for ${symbol}:`, error);
    }
  }
  return priceHistory;
}

export async function getPortfolioAnalytics(address: string): Promise<PortfolioAnalytics> {
  const balanceInfo = await getAccountBalance(address);
  console.log("Raw balance info:", balanceInfo); // Debug log

  const balanceLines = balanceInfo.split('\n');
  const tokenBalances: TokenBalance[] = [];

  balanceLines.forEach(line => {
    console.log("Parsing line:", line); // Debug log

    // Try to match various possible formats
    const match = line.match(/(-\s*[\w\s]+):\s*([\d.]+)\s*(\w+):\s*\$([\d.]+)/) ||
      line.match(/(\w+):\s*\$([\d.]+)/) ||
      line.match(/(\w+):\s*([\d.]+)/);

    if (match) {
      console.log("Matched:", match); // Debug log
      let symbol: string;
      let balance: number;
      let price: number;

      if (match.length === 5) {
        // Format: "- Symbol: 0.1234 SYMBOL: $56.78"
        symbol = (match[1] || "").replace('-', '').trim();
        balance = parseFloat(match[2] || "0");
        price = parseFloat(match[4] || "0");
      } else if (match.length === 3) {
        // Format: "Symbol: $56.78" or "Symbol: 0.1234"
        symbol = (match[1] || "").trim();
        price = parseFloat(match[2] || "0");
        balance = 1; // Assume balance of 1 if not provided
      } else {
        console.log("Unexpected match length, skipping line");
        return;
      }

      if (symbol && !isNaN(balance) && !isNaN(price)) {
        tokenBalances.push({ symbol, balance, price });
        console.log("Added token balance:", { symbol, balance, price }); // Debug log
      } else {
        console.log("Invalid data, skipping line");
      }
    }
  });

  if (tokenBalances.length === 0) {
    console.error("No valid token balances found. Raw balance info:", balanceInfo);
    throw new Error("No valid token balances found");
  }

  const symbols = tokenBalances.map(balance => balance.symbol.toLowerCase());
  const priceHistory = await getPriceHistory(symbols, 30);

  return {
    totalValue: calculateTotalValue(tokenBalances),
    performance: calculatePerformance(tokenBalances, priceHistory),
    diversification: calculateDiversification(tokenBalances),
    riskMetrics: calculateRiskMetrics(tokenBalances, priceHistory)
  };
}


function calculateTotalValue(balances: TokenBalance[]): number {
  return balances.reduce((total, balance) => total + balance.balance * balance.price, 0);
}

function calculatePerformance(balances: TokenBalance[], priceHistory: Record<string, number[]>): { daily: number; weekly: number; monthly: number } {
  const performanceCalc = (days: number) => {
    return balances.reduce((totalPerf, balance) => {
      const history = priceHistory[balance.symbol.toLowerCase()];
      if (!history || history.length <= days) return totalPerf;
      const oldPrice = history[history.length - 1 - days];
      const newPrice = history[history.length - 1];
      const tokenPerf = (newPrice - oldPrice) / oldPrice;
      return totalPerf + (tokenPerf * balance.balance * balance.price);
    }, 0) / calculateTotalValue(balances);
  };

  return {
    daily: performanceCalc(1),
    weekly: performanceCalc(7),
    monthly: performanceCalc(30)
  };
}

function calculateDiversification(balances: TokenBalance[]): { topHoldings: { symbol: string; percentage: number }[]; pieChart: { symbol: string; value: number }[] } {
  const totalValue = calculateTotalValue(balances);
  const sortedBalances = balances.sort((a, b) => (b.balance * b.price) - (a.balance * a.price));

  const topHoldings = sortedBalances.slice(0, 5).map(balance => ({
    symbol: balance.symbol,
    percentage: (balance.balance * balance.price) / totalValue
  }));

  const pieChart = sortedBalances.map(balance => ({
    symbol: balance.symbol,
    value: balance.balance * balance.price
  }));

  return { topHoldings, pieChart };
}

function calculateRiskMetrics(balances: TokenBalance[], priceHistory: Record<string, number[]>): { volatility: number; sharpeRatio: number } {
  const portfolioReturns = balances[0] && priceHistory[balances[0].symbol.toLowerCase()]
    ? priceHistory[balances[0].symbol.toLowerCase()].map((_, index) => {
      return balances.reduce((total, balance) => {
        const prices = priceHistory[balance.symbol.toLowerCase()];
        if (!prices || index === 0) return total;
        const dailyReturn = (prices[index] - prices[index - 1]) / prices[index - 1];
        return total + (dailyReturn * balance.balance * balance.price);
      }, 0) / calculateTotalValue(balances);
    })
    : [];

  if (portfolioReturns.length === 0) {
    return { volatility: 0, sharpeRatio: 0 };
  }

  const avgReturn = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
  const volatility = Math.sqrt(portfolioReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / portfolioReturns.length);
  const sharpeRatio = volatility !== 0 ? (avgReturn - 0.02) / volatility : 0; // Assuming 2% risk-free rate

  return { volatility, sharpeRatio };
}