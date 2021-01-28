import { Embed, GuildTextChannel, Interaction, InteractionResponseType } from 'https://deno.land/x/harmony@v1.0.0/mod.ts'
import { addHideablePost } from "../handlers/imagePostHandler.ts";
import { trim } from "./lib/trim.ts";

interface redditPost {
    data: {
        url: string;
        title: string;
        stickied: boolean;
        selftext: string;
        is_self: boolean;
        score: number;
        num_comments: number;
        domain: string;
        over_18: boolean;
        permalink: string;
        subreddit: string;
        created_utc: number;
    }
}

export const sendRedditEmbed = async (interaction: Interaction) => {
    const subredditOption = interaction.data.options.find(option => option.name === 'subreddit');
    const isImageOption = interaction.data.options.find(option => option.name === 'image');

    const subreddit: string = subredditOption ? subredditOption.value : '';
    const isImage: boolean = isImageOption ? isImageOption.value : false;

    try {
        await interaction.respond({
            type: InteractionResponseType.ACK_WITH_SOURCE,
        });
    } catch (error) {
        console.error(error);
        return;
    }

    const request = await fetch(`https://www.reddit.com/r/${subreddit}.json?limit=100`);
    const redditData = await request.json();

    const posts = redditData.data.children.filter((x: redditPost) => 
        isImage
        ? x.data.url.includes('.jpg') ||
          x.data.url.includes('.png') ||
          x.data.url.includes('.jpeg') ||
          (x.data.url.includes('.gif') && !x.data.url.includes('.gifv'))
        : true
    );

    if (posts.length === 0) {
        await interaction.send('No posts found');
        return;
    }

    const randomIndex = Math.floor(Math.random() * posts.length);
    const post = posts[randomIndex].data;

    const isPostImage = isImage || post.url.includes('.jpg') || post.url.includes('.png') || post.url.includes('.jpeg') || post.url.includes('.gif')

    const postEmbed = new Embed({
        title: post.title,
        url: post.url,
        author: {
            name: `/${post.subreddit_name_prefixed}`,
            url: `https://reddit.com/r/${subreddit}`
        },
        description: `[View Comments](https://www.reddit.com${post.permalink})\n${post.is_self ? trim(post.selftext, 850) : ''}`,
        color: 0xE5343A,
        fields: [
            { name: "Score", value: post.score, inline: true },
            { name: "Comments", value: post.num_comments, inline: true },
            { name: "From", value: post.domain, inline: true },
        ],
        footer: {
            text: `Post ${randomIndex + 1}/${posts.length}`
        }
    });

    if (isPostImage) {
        postEmbed.setImage({
            url: post.url
        })
    }

    if (post.over_18 && !interaction.channel.nsfw) {
        await interaction.send('This channel is not a NSFW channel');
        return;
    }

    const messageResponse = await interaction.send({
        embed: postEmbed,
        allowedMentions: {
            users: []
        }
    });

    if (isPostImage) {
        const channel = await messageResponse.client.channels.get(messageResponse.channelID);
        await (channel as GuildTextChannel).addReaction(messageResponse.id, '🙅');

        addHideablePost(messageResponse.id, {
            details: {
                imageUrl: post.url
            },
            embedMessage: postEmbed,
            poster: interaction.user.id
        })
    }
}