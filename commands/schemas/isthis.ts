import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v2.0.0-rc2/mod.ts";

export const IsThisSchema: SlashCommandPartial = {
    "name": "isthis",
    "description": "Generate an is this meme",
    "options": [
        {
            "name": "message",
            "description": "Message",
            "type": SlashCommandOptionType.STRING,
            "required": true,
        },
    ]
}