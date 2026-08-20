import { verifyKey } from "discord-interactions";

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
    throw new Error(
      `Serper API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return data.images ?? [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  if (!signature || !timestamp) {
    return res.status(401).json({
      error: "Missing Discord signature"
    });
  }

  const rawBody =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  const isValid = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValid) {
    return res.status(401).json({
      error: "Invalid request signature"
    });
  }

  const interaction = req.body;

  // Discord Ping
  if (interaction.type === 1) {
    return res.status(200).json({
      type: 1
    });
  }

  // Slash command
  if (
    interaction.type === 2 &&
    interaction.data?.name === "img"
  ) {
    const query = interaction.data.options?.find(
      option => option.name === "query"
    )?.value;

    if (!query) {
      return res.status(200).json({
        type: 4,
        data: {
          content: "Podaj frazę do wyszukania."
        }
      });
    }

    // Natychmiast odpowiadamy Discordowi,
    // żeby nie przekroczyć limitu czasu interakcji.
    res.status(200).json({
      type: 5,
      data: {
        flags: 64
      }
    });

    try {
      const images = await searchImages(query);

      if (!images.length) {
        await editOriginalResponse(
          interaction.application_id,
          interaction.token,
          {
            content: `Nie znalazłem zdjęć dla **${query}**.`,
            embeds: []
          }
        );

        return;
      }

      const image = images[0];

      const embed = {
        color: 0x5865f2,
        title: `Wynik: ${query}`,
        image: {
          url: image.imageUrl
        },
        url: image.link,
        description: image.source
          ? `Źródło: **${image.source}**`
          : undefined,
        footer: {
          text: "Google Images • Serper"
        },
        timestamp: new Date().toISOString()
      };

      await editOriginalResponse(
        interaction.application_id,
        interaction.token,
        {
          content: "",
          embeds: [embed]
        }
      );
    } catch (error) {
      console.error(error);

      await editOriginalResponse(
        interaction.application_id,
        interaction.token,
        {
          content:
            "Wystąpił błąd podczas wyszukiwania zdjęcia. Sprawdź konfigurację Serper API.",
          embeds: []
        }
      );
    }

    return;
  }

  return res.status(400).json({
    error: "Unknown interaction"
  });
}

async function editOriginalResponse(
  applicationId,
  interactionToken,
  body
) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Discord API error: ${response.status} ${text}`
    );
  }

  return response;
}