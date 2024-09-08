import axios from "axios";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const SUPPORTED_CHAINS = [
  { id: "1", name: "Ethereum" },
  { id: "137", name: "Polygon" },
  { id: "56", name: "Binance Smart Chain" },
];

export async function getAccountBalance(address: string): Promise<string> {
  try {
    let totalBalanceUSD = 0;
    let balanceDetails = "Your account balances:\n\n";

    for (const chain of SUPPORTED_CHAINS) {
      const response = await axios.get(
        `https://api.covalenthq.com/v1/${chain.id}/address/${address}/balances_v2/`,
        {
          headers: {
            'Authorization': `Bearer ${COVALENT_API_KEY}`
          }
        }
      );

      const items = response.data.data.items;
      let chainTotalUSD = 0;

      balanceDetails += `${chain.name}:\n`;

      for (const item of items) {
        if (item.balance !== "0" && item.quote > 0) {
          const balance = parseInt(item.balance) / Math.pow(10, item.contract_decimals);
          balanceDetails += `- ${balance.toFixed(4)} ${item.contract_ticker_symbol}: $${item.quote.toFixed(2)}\n`;
          chainTotalUSD += item.quote;
        }
      }

      balanceDetails += `Total on ${chain.name}: $${chainTotalUSD.toFixed(2)}\n\n`;
      totalBalanceUSD += chainTotalUSD;
    }

    balanceDetails += `\nTotal balance across all chains: $${totalBalanceUSD.toFixed(2)}`;

    return balanceDetails;
  } catch (error) {
    console.error("Error fetching account balance:", error);
    return "Unable to fetch account balance at this time.";
  }
}
