import { Embed, InteractionResponseType, SlashCommandInteraction } from 'https://deno.land/x/harmony@v2.0.0-rc2/mod.ts'
import { format } from "https://deno.land/x/date_fns@v2.15.0/index.js";
import { MessageAttachment } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";
import { AllWebhookMessageOptions } from "https://deno.land/x/harmony@v2.0.0-rc2/src/structures/webhook.ts";
import { sendInteraction } from "./lib/sendInteraction.ts";

export const fetchQuote = async (interaction: SlashCommandInteraction) => {
    if (!interaction.data) {
        return;
    }

    const symbolOption = interaction.data.options.find(option => option.name === 'symbol');
    const symbol: string = symbolOption ? symbolOption.value : '';

    const timeRangeOption = interaction.data.options.find(option => option.name === 'timerange');
    const timeRange: string = timeRangeOption ? timeRangeOption.value : '1d';

    await interaction.respond({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`

    let stockResp = await fetch(url);
    let stock = await stockResp.json();
    let {result} = stock.quoteResponse;

    if (result.length === 0 || (result[0].quoteType === 'MUTUALFUND' && !result[0].marketCap)) {
        stockResp = await fetch(url + '-USD');
        stock = await stockResp.json();
        result = stock.quoteResponse.result;

        if (result.length === 0) {
            await interaction.send(`${symbol} not found`, {});
            return;
        }
    }

    const [data] = result;
    const {symbol: returnedSymbol, exchange, quoteType, coinImageUrl, fromCurrency, longName, shortName, regularMarketPrice, regularMarketChange, regularMarketChangePercent, regularMarketTime} = data;

    if (!regularMarketTime) {
        await interaction.send(`${symbol} not found`, {});
        return;
    }

    const lastRefresh = new Date(regularMarketTime * 1000);
    const lastRefreshFormat = format(lastRefresh, "yyyy-MM-dd'T'HH:mm:ssxxx", undefined);
    const diffSymbol = regularMarketChange > 0 ? '<:small_green_triangle:851144859103395861>' : '🔻';
    const diffColor = regularMarketChange > 0 ? 0x44bd32 : 0xe74c3c;
    
    const image = await fetchChart(returnedSymbol, timeRange).catch(err => {
        console.log(err);
    });
    
    const stockEmbed = new Embed({
        title: `${longName || shortName} (${returnedSymbol})`,
        timestamp: lastRefreshFormat,
        color: diffColor,
    });

    if (quoteType === 'CRYPTOCURRENCY') {
        stockEmbed.setAuthor({
            icon_url: coinImageUrl,
            name: fromCurrency
        });
        stockEmbed.setDescription(`${regularMarketPrice}\n${diffSymbol} ${Math.abs(regularMarketChange)} (${regularMarketChangePercent.toFixed(2)}%)`);
    } else {
        stockEmbed.setDescription(`${regularMarketPrice.toFixed(2)}\n${diffSymbol} ${Math.abs(regularMarketChange.toFixed(2))} (${regularMarketChangePercent.toFixed(2)}%)`);
        stockEmbed.setFooter(`Exchange: ${exchange}`);
    }

    const payload: AllWebhookMessageOptions = {
        embeds: [stockEmbed],
    };

    if (image) {
        const imageAttach = new MessageAttachment(`${returnedSymbol}.png`, image);
        payload.file = imageAttach;

        stockEmbed.setImage({
            url: `attachment://${returnedSymbol}.png`
        });
    }

    await interaction.send(payload);
}

const fetchChart = async (symbol: string, timeRange: string): Promise<Uint8Array> => {
    const badger = Deno.run({
        cmd: ["python3", "./helpers/badger.py", symbol, timeRange],
        stdout: 'piped'
    });

    const output = await badger.output();
    const { code } = await badger.status();
    
    if (code !== 0) {
        throw new Error('Candlesticks chart not generated')
    }

    return output;
}
