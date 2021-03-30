import { SlashCommandOptionType, SlashCommandPartial } from "https://deno.land/x/harmony@v1.1.5/src/types/slash.ts";

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