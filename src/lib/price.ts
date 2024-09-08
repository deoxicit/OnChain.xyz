import axios from "axios";

export async function fetchBitcoinPrice(): Promise<string> {
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
    return response.data.bitcoin.usd.toFixed(2);
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    return "Unable to fetch price";
  }
}
