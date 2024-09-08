import { HandlerContext } from "@xmtp/message-kit";
import { GenericRedisClient } from "../lib/redis.js";
import { sendWaitMessage } from "../utils/waitMessage.js";
import { fetchGasPrices } from "./fetchGasPrices.js";

const NETWORKS: { [key: string]: string } = {
    '1': 'Ethereum',
    '10': 'Optimism',
    '137': 'Polygon',
    '42161': 'Arbitrum'
};

export async function handleGasPriceNotification(
    context: HandlerContext,
    redisClient: GenericRedisClient,
    address: string,
    input: string
): Promise<{ message: string; showMenu: boolean }> {
    const step = await redisClient.get(`${address}:gas_step`) || '0';

    if (step === '0') {
        await redisClient.set(`${address}:gas_step`, '1');
        return {
            message: `Select a network to check gas prices:
1. Ethereum
2. Polygon`,
            showMenu: false
        };
    } else if (step === '1') {
        let networkId: string;
        switch (input) {
            case '1': networkId = '1'; break;
            case '2': networkId = '137'; break;
            default:
                await redisClient.set(`${address}:gas_step`, '0');
                return { message: "Invalid option. Please try again.", showMenu: true };
        }

        const waitMessageTimer = await sendWaitMessage(context);
        try {
            const gasPrices = await fetchGasPrices(networkId);
            clearTimeout(waitMessageTimer);

            const message = `Current gas prices for ${NETWORKS[networkId]}:
Safe: ${gasPrices.safe.toFixed(2)} Gwei
Standard: ${gasPrices.standard.toFixed(2)} Gwei
Fast: ${gasPrices.fast.toFixed(2)} Gwei
Base Fee: ${gasPrices.baseFee.toFixed(2)} Gwei

Would you like to set up an alert?
1. Yes
2. No`;

            await redisClient.set(`${address}:gas_step`, '2');
            await redisClient.set(`${address}:gas_network`, networkId);
            return { message, showMenu: false };
        } catch (error) {
            clearTimeout(waitMessageTimer);
            console.error('Error fetching gas prices:', error);
            await redisClient.set(`${address}:gas_step`, '0');
            return { message: "Sorry, there was an error fetching gas prices. Please try again later.", showMenu: true };
        }
    } else if (step === '2') {
        if (input === '1') {
            await redisClient.set(`${address}:gas_step`, '3');
            return { message: "Enter the gas price (in Gwei) below which you'd like to be notified:", showMenu: false };
        } else {
            await redisClient.set(`${address}:gas_step`, '0');
            return { message: "Alright, no alert will be set. Is there anything else I can help you with?", showMenu: true };
        }
    } else if (step === '3') {
        const alertPrice = parseInt(input);
        if (isNaN(alertPrice) || alertPrice <= 0) {
            return { message: "Invalid gas price. Please enter a positive number.", showMenu: false };
        }

        const networkId = await redisClient.get(`${address}:gas_network`);
        if (networkId != null) {
            await redisClient.set(`${address}:gas_alert:${networkId}`, alertPrice.toString());
            await redisClient.set(`${address}:gas_step`, '0');
            return { message: `Alert set! You'll be notified when the gas price on ${NETWORKS[networkId]} drops below ${alertPrice} Gwei.`, showMenu: true };
        }
    }

    await redisClient.set(`${address}:gas_step`, '0');
    return { message: "An error occurred. Please try again.", showMenu: true };
}