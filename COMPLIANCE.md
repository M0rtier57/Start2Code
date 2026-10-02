# Compliance — wat er is nagekeken en veranderd

Datum van de audit: **2 oktober 2026**. Gebaseerd op de code zoals die er op dat
moment stond, niet op een sjabloon.

Dit document is geen juridisch advies. Het beschrijft wat er in de code zit, zodat
een jurist of een school kan nakijken of dat volstaat.

---

## 1. Wat er nog moet gebeuren (jij)

Zonder deze punten is de site **niet** in orde, hoe goed de code ook is.

| # | Wat | Waar |
|---|-----|------|
| 1 | Adres en ondernemingsnummer van CodeLab invullen | `src/lib/site.js` |
| 2 | Nakijken in welke regio je Supabase-project draait, en die invullen | `src/lib/site.js` → `dataRegion` |
| 3 | `[ADRES]` vervangen in de twee mailsjablonen | `supabase/email-templates/*.html` |
| 4 | `supabase/data-deletion.sql` draaien | Supabase SQL editor |
| 5 | De mailsjablonen in Supabase plakken | Authentication → Emails |
| 6 | `https://code.codelab.be/**` toevoegen aan Redirect URLs | Authentication → URL Configuration |
| 7 | `npm run fonts` draaien, zodat de lettertypen lokaal staan | lokaal, daarna deployen |
| 8 | De verwerkersovereenkomst (DPA) van Supabase en van Hostinger ondertekenen/downloaden en bewaren | hun dashboards |
| 9 | Een register van verwerkingsactiviteiten aanleggen (AVG art. 30) | buiten de code |
| 10 | De bewaartermijnen die in de privacyverklaring staan ook echt uitvoeren | zie §6 |

Punt 1 en 2 zijn blokkerend: tot ze ingevuld zijn tonen alle juridische pagina's
zichtbaar dat ze een concept zijn. Dat is bewust — een privacyverklaring zonder
een echte, bereikbare verantwoordelijke is geen privacyverklaring.

---

## 2. Audit van derde partijen

Alles wat de browser van een kind buiten onze eigen server om aanspreekt:

| Partij | Wanneer | Wat ze zien | Oordeel |
|---|---|---|---|
| Supabase | altijd | account, projecten, voortgang | verwerker, nodig, DPA vereist |
| Hostinger | altijd | de site zelf | verwerker, nodig |
| **Google Fonts** | ~~elke pagina~~ | ~~IP-adres van elke bezoeker~~ | **verwijderd** ✔ |
| pyscript.net | pas bij een Pythonproject | IP-adres | functioneel; vermeld in beleid |
| scratch.mit.edu | pas bij kiezen uit de bibliotheek | IP-adres | functioneel; vermeld in beleid |

**Verwijderd:** de koppeling naar `fonts.googleapis.com` / `fonts.gstatic.com`.
Die stuurde het IP-adres van elk kind naar Google voordat er iets geklikt was, op
elke paginalading. De lettertypen staan nu onder de SIL Open Font License lokaal
(`npm run fonts`); tot dat script gedraaid is valt de site terug op het
systeemlettertype en breekt er niets.

**Niet gevonden, en dat is goed nieuws:** geen Google Analytics, geen Meta-pixel,
geen Hotjar, geen advertentienetwerk, geen A/B-testdienst, geen sessie-opname,
geen chatwidget, geen foutenrapportagedienst. De activiteitenlijst in de database
bevat geen IP-adres, geen user-agent en geen locatie.

**Nog te overwegen:** PyScript en Pyodide zelf hosten. Dat is ongeveer 10 MB aan
bestanden en haalt de laatste externe aanroep weg. Niet gedaan omdat het de
bouwtijd en de repository fors doet groeien; het staat eerlijk in het
cookiebeleid vermeld.

---

## 3. Cookies en toestemming

**Bevinding: er zijn geen cookies.** De site zet er geen enkele. Wat bewaard
wordt, staat in `localStorage` en `sessionStorage` van de browser zelf.

Alles wat bewaard wordt is strikt noodzakelijk (inlogsessie, taalkeuze,
afgevinkte stappen, en twee technische hulpnotities). Daarvoor is volgens
ePrivacy geen toestemming nodig — informeren wel.

Daarom is de banner een **mededeling** en geen toestemmingsmuur:

- hij blokkeert de pagina niet;
- er is geen "Alles accepteren" naast een grijs weggemoffeld "Weigeren";
- er wordt niets gevraagd dat niet geweigerd kán worden zonder het inloggen te
  breken. Kinderen een nepkeuze voorschotelen leert ze dat hun keuze nep is.

`src/lib/consent.js` heeft wél categorieën voorbereid. Komt er ooit iets
optioneels bij (statistiek, een ingesloten video), dan: categorie toevoegen,
standaard op `false`, en het laden afschermen met `allows('...')`.

---

## 4. Donkere patronen, verborgen kosten, onwaarheden

Nagekeken en **niets gevonden** van wat je in deze categorie verwacht: geen
vooraf aangevinkte vakjes, geen aftelklok, geen schaarstemelding ("nog 2
plaatsen!"), geen opzegging die moeilijker is dan inschrijven, geen prijzen die
pas bij de laatste stap verschijnen, geen "gratis" dat later toch iets kost.

Op de site wordt niets verkocht en nergens om een betaling gevraagd. Dat staat
nu ook expliciet in de voorwaarden, samen met de waarschuwing dat een scherm dat
hier wél om kaartgegevens vraagt niet van ons is.

Wat wél veranderd is:

- **Toestemming is niet langer stilzwijgend.** Het registratieformulier had geen
  enkele verwijzing naar voorwaarden of privacy. Nu staat er een leeg vakje dat
  je zelf moet aanvinken, met links naar beide teksten.
- **Claims nagekeken.** De toegankelijkheidsverklaring belooft alleen wat
  gemeten is, en noemt bij naam wat níét werkt (de Scratch-editor met het
  toetsenbord, het Python-speelveld voor een voorleesprogramma, de nog niet
  vertaalde leerkrachtschermen). Liever een korte lijst die klopt dan een lange
  die mooi oogt.

---

## 5. Kinderen

Je gaf aan: jonge kinderen, met een licentiecode van hun leerkracht.

**Veranderd:** kinderen kunnen zich niet meer zelf registreren. Het publieke
formulier maakt nog uitsluitend leerkrachtaccounts aan, met de uitleg erbij dat
de leerkracht de accounts voor de kinderen aanmaakt.

Waarom: onder de 13 kan een kind in België niet rechtsgeldig zelf toestemming
geven (AVG art. 8). Een registratieformulier dat een achtjarige "ik ga akkoord"
laat aanvinken, verzamelt een handtekening die juridisch niets waard is. Via de
school loopt de toestemming langs de ouders, waar ze hoort.

Terugdraaien kan met één regel: `ALLOW_STUDENT_SELF_SIGNUP` in `src/lib/site.js`.
Doe dat niet zonder na te gaan hoe je dan aan ouderlijke toestemming komt.

Verder voor kinderen: geen e-mailadres, geen achternaam, geen geboortedatum,
geen foto, geen chat, geen publieke galerij, geen profielpagina. Ze zien elkaars
werk niet.

---

## 6. Bewaartermijnen — een belofte die je moet waarmaken

De privacyverklaring belooft dat een account waarmee 24 maanden niet is ingelogd
wordt verwijderd. `delete_dormant_accounts()` in `supabase/data-deletion.sql`
doet dat, maar staat **bewust niet op een timer**: een klas werk laten
verdwijnen door een ongeziene cron-taak is hoe een school een jaar aan projecten
kwijtraakt.

Zet dit één keer per jaar in je agenda. Tel eerst:

```sql
select count(*) from auth.users
where coalesce(last_sign_in_at, created_at) < now() - interval '24 months';
```

Klopt het aantal, draai dan `select public.delete_dormant_accounts();`.

Doe je dit niet, pas dan de privacyverklaring aan. Een bewaartermijn die je niet
uitvoert, is een onjuiste mededeling.

---

## 7. Toegankelijkheid

Gemeten, niet geschat. `WCAG 2.1 AA`.

**Contrast.** Elk tekst/achtergrond-paar in `src/index.css` is doorgerekend.
Vier zakten onder 4,5:1 en zijn aangepast:

| Waar | Was | Nu |
|---|---|---|
| Elke primaire knop (wit op teal) | 2,74 | **4,83** |
| Knop bij aanwijzen | 3,60 | **6,50** |
| Rode knop (wit op koraal) | 3,03 | **4,53** |
| Tabelkoppen | 3,40 | **4,51** |

De decoratieve kleuren (teal, koraal, zongeel) zijn expres fel gebleven — die
dragen randen en vlakken, nooit kleine tekst. De berekening staat onderaan
`src/index.css`, zodat de volgende die een kleur aanraakt weet wat de lat is.

**Toetsenbord.**

- De focusring was `#a9e0d5` op wit: 1,4:1, praktisch onzichtbaar. Nu een donkere
  ring met witte halo, 14,4:1, en er is een `:focus-visible`-regel voor alles wat
  geen eigen regel had.
- Een "Ga naar de inhoud"-link bovenaan, zichtbaar zodra je Tab indrukt
  (geverifieerd in de browser).
- Dialoogvensters hielden de focus niet vast: met Tab liep je de pagina erachter
  in, die een voorleesprogramma niet eens als afgeschermd ziet. Nu een echte
  focusval, met de focus terug naar waar je vandaan kwam bij het sluiten.

**Verder.** `prefers-reduced-motion` wordt gerespecteerd (alles hier springt en
kantelt). De pagina staat nu op `lang="nl"` in plaats van `lang="en"` — een
voorleesprogramma las de hele site met een Engelse uitspraak voor. Uitgeschakelde
knoppen staan op 60% in plaats van 45% dekking. Eén knop zonder label heeft er
een gekregen; het logo is correct als decoratief gemarkeerd omdat de naam er in
tekst naast staat.

**Nog niet opgelost:** de Scratch-editor (zie de toegankelijkheidsverklaring) en
de niet-vertaalde leerkrachtschermen.

---

## 8. Gegevens: wat we hebben en hoe je het kwijtraakt

Volledige inventaris van persoonsgegevens:

| Tabel | Velden | Nodig voor |
|---|---|---|
| `profiles` | e-mail, naam, rol, avatar | inloggen, de leerkracht laten zien wie wie is |
| `classes`, `class_members` | klasnaam, code, lidmaatschap | een klas kunnen vormen |
| `projects` | titel, code, .sb3, voorbeeldplaatje | het werk zelf |
| `lesson_progress` | afgevinkte stappen | verdergaan waar je gebleven was |
| `reviews` | geslaagd/niet, score, opmerkingen | verbeteren |
| `activity_events` | soort, project-id, tijdstip | de leerkracht ziet dat er gewerkt is |

Doorgelicht op overbodige gegevens: **niets gevonden dat weg kan**. Geen
IP-adressen, geen user-agents, geen geboortedata, geen telefoonnummers. De
activiteitenlijst is het enige dat je zou kunnen schrappen, maar hij bevat geen
persoonskenmerk en draagt een echte functie.

**Nieuw: "Mijn gegevens"** (`/mijn-gegevens`, in het menu).

- *Downloaden* geeft één JSON-bestand met alles uit de tabellen hierboven.
  Dekt het recht op inzage én op overdraagbaarheid.
- *Verwijderen* wist het account echt, inclusief de Scratch-bestanden in Storage
  (die niet meeliften op een foreign key). Je moet je eigen naam overtypen.
  Een leerkracht met nog actieve klassen wordt tegengehouden, want anders
  verdwijnen de klassen van de kinderen mee.

Daarnaast: `delete_student_account()` voor een leerkracht die een kind moet
wissen op vraag van een ouder. Die kan alleen bij kinderen in zijn eigen klas, en
alleen bij accounts op het interne leerlingdomein — nooit bij een collega.

---

## 9. E-mail

Er worden maar twee mails verstuurd: bevestiging bij registratie, en een link
voor een nieuw wachtwoord. Beide staan nu als bestand in
`supabase/email-templates/`.

**Over de afmeldlink.** Die zit er bewust niet in, en dat is de juiste keuze:
beide mails zijn transactioneel. Je krijgt ze alleen omdat je zelf net iets
gedaan hebt, en ze moeten aankomen — ook bij wie nooit nieuwsbrieven wil. Een
afmeldknop die een wachtwoordherstelmail zou tegenhouden is schadelijk, en een
knop die doet alsof is misleidend.

Wat er in plaats daarvan staat, en dezelfde vraag beantwoordt: waarom je de mail
krijgt, wat je doet als jij het niet was, wie hem stuurt met adres en
contactmail, dat we geen reclame sturen, en een link naar het verwijderen van je
gegevens.

Komt er ooit een nieuwsbrief, dan is een afmeldlink verplicht — en dan hoort die
mail niet via deze sjablonen te lopen.

---

## 10. Licenties

| Wat | Licentie | In orde? |
|---|---|---|
| Scratch (code) | BSD 3-Clause | ja, vermeld |
| Scratch (figuren, geluiden) | CC BY-SA 4.0 | ja, vermeld |
| PyScript, Pyodide | Apache 2.0 | ja |
| CPython | PSF | ja |
| pygame-ce | LGPL 2.1 | ja |
| Inter, JetBrains Mono | SIL OFL 1.1 | ja, mits lokaal gehost — `npm run fonts` schrijft ook `OFL.txt` |
| Logo | eigendom van CodeLab | ja |
| Symbolen in de app | emoji, getekend door het besturingssysteem | geen licentie nodig |

Alles staat op `/licenties`. Daar staat ook, zoals het merkenrecht vereist, dat
Scratch een handelsmerk van het MIT is en dat deze site niet door hen gemaakt of
goedgekeurd is.

**Nagekeken:** er staat geen enkele stockfoto of overgenomen illustratie in de
repository. Het enige beeldbestand is het logo.

---

## 11. Wat ik niet kon beoordelen

Eerlijk is eerlijk:

- Of de bewaartermijnen passen bij wat de scholen in hun eigen beleid hebben
  afgesproken.
- Of CodeLab een functionaris voor gegevensbescherming (DPO) nodig heeft. Bij
  stelselmatige verwerking van gegevens van kinderen is dat geen uitgemaakte
  zaak; vraag het na.
- Of er een gegevensbeschermingseffectbeoordeling (DPIA) nodig is. Gegevens van
  kinderen op schaal is een van de aanwijzingen die de GBA daarvoor noemt.
- De voorwaarden van de inschrijving op codelab.be, waar `/terugbetaling` naar
  verwijst. Die tekst heb ik niet gezien.
