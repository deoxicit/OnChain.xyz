import axios from 'axios';

interface GasPrice {
    safe: number;
    standard: number;
    fast: number;
    baseFee: number;
}

interface EtherscanResponse {
    status: string;
    message: string;
    result: {
        LastBlock: string;
        SafeGasPrice: string;
        ProposeGasPrice: string;
        FastGasPrice: string;
        suggestBaseFee: string;
        gasUsedRatio: string;
    };
}

export async function fetchGasPrices(network: string): Promise<GasPrice> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const polygonapiKey = process.env.POLYGONSCAN_API_KEY;
    let url: string;

    switch (network) {
        case '1':
            url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;
            break;
        case '137':
            url = `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${polygonapiKey}`;
            break;
        default:
            throw new Error('Unsupported network');
    }
    try {
        const response = await axios.get<EtherscanResponse>(url);

        if (response.data.status !== "1" || response.data.message !== "OK") {
            throw new Error(`API Error: ${response.data.message}`);
        }

        const result = response.data.result;

        return {
            safe: parseFloat(result.SafeGasPrice),
            standard: parseFloat(result.ProposeGasPrice),
            fast: parseFloat(result.FastGasPrice),
            baseFee: parseFloat(result.suggestBaseFee)
        };
    } catch (error) {
        console.error('Error fetching gas prices:', error);
        throw error;
    }
}