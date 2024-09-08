import { HandlerContext } from "@xmtp/message-kit";
import { getPortfolioAnalytics } from '../lib/portfolioAnalytics.js';
import { sendWaitMessage } from "../utils/waitMessage.js";

export async function handlePortfolioAnalytics(context: HandlerContext, address: string): Promise<{ message: string; showMenu: boolean }> {
  const waitMessageTimer = await sendWaitMessage(context);
  
  try {
    const analytics = await getPortfolioAnalytics(address);
    clearTimeout(waitMessageTimer);
    
    const message = `
Portfolio Analytics:
Total Value: $${analytics.totalValue.toFixed(2)}

Performance:
Daily: ${(analytics.performance.daily * 100).toFixed(2)}%
Weekly: ${(analytics.performance.weekly * 100).toFixed(2)}%
Monthly: ${(analytics.performance.monthly * 100).toFixed(2)}%

Top Holdings:
${analytics.diversification.topHoldings.map(holding => `${holding.symbol}: ${(holding.percentage * 100).toFixed(2)}%`).join('\n')}

Risk Metrics:
Volatility: ${(analytics.riskMetrics.volatility * 100).toFixed(2)}%
Sharpe Ratio: ${analytics.riskMetrics.sharpeRatio.toFixed(2)}
    `;

    return { message, showMenu: true };
  } catch (error) {
    console.error('Error in getPortfolioAnalytics:', error);
    clearTimeout(waitMessageTimer);
    return { message: "Sorry, there was an error calculating your portfolio analytics. Please try again later.", showMenu: true };
  }
}