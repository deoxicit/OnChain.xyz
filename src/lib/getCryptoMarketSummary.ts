import axios from "axios";

interface CoinInfo {
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  price_change_24h: number;
}

interface MarketSentiment {
  value: string;
  classification: string;
}

interface MarketInfo {
  topCoins: CoinInfo[];
  sentiment: MarketSentiment;
}

interface CoinGeckoResponse {
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
}

async function fetchCryptoMarketInfo(): Promise<MarketInfo | null> {
  try {
    const response = await axios.get<CoinGeckoResponse[]>(
      "https://api.coingecko.com/api/v3/coins/markets",
      {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 3,
          page: 1,
          sparkline: false,
          price_change_percentage: "24h",
        },
      }
    );

    const topCoins: CoinInfo[] = response.data.map((coin: CoinGeckoResponse) => ({
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_24h: coin.price_change_percentage_24h,
    }));

    const sentimentResponse = await axios.get(
      "https://api.alternative.me/fng/"
    );
    const sentiment = sentimentResponse.data.data[0];

    return {
      topCoins,
      sentiment: {
        value: sentiment.value,
        classification: sentiment.value_classification,
      },
    };
  } catch (error) {
    console.error("Error fetching crypto market info:", error);
    return null;
  }
}

export async function getCryptoMarketSummary(): Promise<string> {
  const marketInfo = await fetchCryptoMarketInfo();
  
  if (!marketInfo) {
    return "Unable to fetch crypto market information at this time.";
  }

  let summary = "Top 3 Cryptocurrencies by Market Cap:\n\n";

  marketInfo.topCoins.forEach((coin: CoinInfo, index: number) => {
    summary += `${index + 1}. ${coin.name} (${coin.symbol}):\n`;
    summary += `   Price: $${coin.price.toFixed(2)}\n`;
    summary += `   Market Cap: $${(coin.market_cap / 1e9).toFixed(2)} billion\n`;
    summary += `   24h Change: ${coin.price_change_24h.toFixed(2)}%\n\n`;
  });

  summary += `Market Sentiment (Fear and Greed Index):\n`;
  summary += `Value: ${marketInfo.sentiment.value}\n`;
  summary += `Classification: ${marketInfo.sentiment.classification}\n`;

  return summary;
}