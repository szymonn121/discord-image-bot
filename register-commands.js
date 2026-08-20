import "dotenv/config";

const command = {
  name: "img",
  description: "Wyszukuje zdjęcie przez Google Images",
  type: 1,
  options: [
    {
      name: "query",
      description: "Czego szukasz?",
      type: 3,
      required: true
    }
  ]
};

const url =
  `https://discord.com/api/v10/applications/` +
  `${process.env.DISCORD_APPLICATION_ID}` +
  `/guilds/${process.env.DISCORD_GUILD_ID}/commands`;

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(command)
});

const text = await response.text();

if (!response.ok) {
  console.error("Błąd rejestracji komendy:");
  console.error(text);
  process.exit(1);
}

console.log("Komenda /img została zarejestrowana!");
console.log(text);