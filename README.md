# Discord Image Bot

Bot Discord z komendą:

`.img <fraza>`

Przykład:

`.img Toyota Supra MK4`

Bot wyszukuje obraz w Google Images przez Serper i wysyła pierwszy wynik jako Discord Embed.

## Wymagania

- Node.js 20+
- konto Discord Developer
- klucz API Serper

## Instalacja

```bash
npm install
```

Skopiuj `.env.example` do `.env`:

```bash
cp .env.example .env
```

Uzupełnij:

```env
DISCORD_TOKEN=...
SERPER_API_KEY=...
```

Uruchom:

```bash
npm start
```

## Discord Developer Portal

W ustawieniach bota włącz:

**Privileged Gateway Intents → Message Content Intent**

Bot potrzebuje co najmniej:

- View Channels
- Send Messages
- Embed Links

## Ważne

Ta wersja jest przeznaczona do hostingu procesu Node.js (np. VPS/Oracle Cloud), a nie jako zwykła funkcja Vercel.

Vercel może być użyty do wersji opartej o Discord Interactions / slash command `/img`, ale nie do utrzymywania klasycznego klienta Discord z `client.login()` 24/7.
