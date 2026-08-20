import {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".img";

async function searchImages(query) {
  const response = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: query,
      num: 10,
      gl: "pl",
      hl: "pl",
      safe: "active"
    })
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.images ?? [];
}

client.once("ready", () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  console.log(`Serwery: ${client.guilds.cache.size}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(PREFIX)) return;

  const query = content.slice(PREFIX.length).trim();

  if (!query) {
    await message.reply("Użycie: `.img nazwa zdjęcia`");
    return;
  }

  await message.channel.sendTyping();

  try {
    const images = await searchImages(query);

    if (!images.length) {
      await message.reply(`Nie znalazłem zdjęć dla **${query}**.`);
      return;
    }

    const image = images[0];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Wynik: ${query}`)
      .setImage(image.imageUrl)
      .setURL(image.link)
      .setDescription(image.source ? `Źródło: **${image.source}**` : null)
      .setFooter({ text: "Google Images • Serper" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await message.reply(
      "Wystąpił błąd podczas wyszukiwania zdjęcia. Sprawdź konfigurację API."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
