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

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }

  // Discord wymaga ORYGINALNEGO body do weryfikacji podpisu.
  const rawBody = await request.text();

  const signature =
    request.headers.get("x-signature-ed25519");

  const timestamp =
    request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp) {
    return new Response("Missing Discord signature", {
      status: 401
    });
  }

  const isValid = await verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValid) {
    return new Response("Invalid request signature", {
      status: 401
    });
  }

  let interaction;

  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", {
      status: 400
    });
  }

  // Discord Ping podczas ustawiania Endpoint URL
  if (interaction.type === 1) {
    return Response.json({
      type: 1
    });
  }

  // /img
  if (
    interaction.type === 2 &&
    interaction.data?.name === "img"
  ) {
    const query = interaction.data.options?.find(
      option => option.name === "query"
    )?.value;

    if (!query) {
      return Response.json({
        type: 4,
        data: {
          content: "Podaj frazę do wyszukania."
        }
      });
    }

    // Natychmiastowe potwierdzenie interakcji.
    // Discord wymaga odpowiedzi w ciągu 3 sekund.
    const response = Response.json({
      type: 5
    });

    // Praca może być wykonana po wysłaniu odpowiedzi.
    processImageSearch(
      interaction.application_id,
      interaction.token,
      query
    ).catch(error => {
      console.error("Image search error:", error);
    });

    return response;
  }

  return Response.json({
    type: 4,
    data: {
      content: "Nieznana komenda."
    }
  });
}

async function processImageSearch(
  applicationId,
  interactionToken,
  query
) {
  try {
    const images = await searchImages(query);

    if (!images.length) {
      await editOriginalResponse(
        applicationId,
        interactionToken,
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
      url: image.link,
      image: {
        url: image.imageUrl
      },
      description: image.source
        ? `Źródło: **${image.source}**`
        : undefined,
      footer: {
        text: "Google Images • Serper"
      },
      timestamp: new Date().toISOString()
    };

    await editOriginalResponse(
      applicationId,
      interactionToken,
      {
        content: "",
        embeds: [embed]
      }
    );
  } catch (error) {
    console.error(error);

    try {
      await editOriginalResponse(
        applicationId,
        interactionToken,
        {
          content:
            "Wystąpił błąd podczas wyszukiwania zdjęcia.",
          embeds: []
        }
      );
    } catch (discordError) {
      console.error(
        "Discord response error:",
        discordError
      );
    }
  }
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