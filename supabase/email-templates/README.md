# E-mailsjablonen

Supabase bewaart de sjablonen in het dashboard, niet in deze repository. Daarom
staan ze hier als bestand: dan is te zien wat er verstuurd wordt, en kun je het
terugzetten als het dashboard ooit leegloopt.

**Plakken in:** Supabase → Authentication → Emails → Templates.

| Bestand | Template in Supabase |
|---|---|
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset password |

## Waarom er geen afmeldlink in staat

Een afmeldlink hoort bij reclame. Deze twee mails zijn dat niet: ze gaan over je
eigen account en je krijgt ze alleen omdat jij net iets gedaan hebt — een account
aanmaken, of een nieuw wachtwoord aanvragen. Zulke mails *moeten* aankomen, ook
bij wie zich voor nieuwsbrieven heeft afgemeld, en een afmeldknop die niets doet
is misleidend.

Wat er wél in staat, en wat dezelfde vraag beantwoordt:

- **waarom** je deze mail krijgt, in de eerste regel onder de knop;
- **wat je doet als jij het niet was** — niets, en de link verloopt vanzelf;
- **wie** hem stuurt, met adres en contactmail;
- **hoe je je gegevens laat verwijderen**, met een link naar de pagina daarvoor.

Komt er ooit wél een nieuwsbrief of een mail die niet over het account zelf gaat,
dan is een afmeldlink verplicht — en dan hoort die mail niet via deze sjablonen
te lopen.

## Nog in te vullen

Beide sjablonen bevatten `[ADRES]`. Vul daar het adres van CodeLab in, hetzelfde
als in `src/lib/site.js`. Een afzender zonder adres is in de EU niet in orde.

## Afzender

Supabase → Project Settings → Authentication → SMTP Settings.

- Sender email en Username moeten allebei `contact@codelab.be` zijn. Zet je daar
  een alias neer waarvoor geen SMTP-wachtwoord bestaat, dan antwoordt Hostinger
  met 550 en komt er niets aan.
- Sender name: `Start2Code`.
