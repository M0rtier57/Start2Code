/**
 * De juridische teksten, in het Nederlands — de taal waarin ze gelden.
 *
 * Geschreven op wat de app werkelijk doet, niet op een sjabloon. Verandert de
 * app, dan moet deze tekst mee veranderen: een privacyverklaring die niet meer
 * klopt is schadelijker dan geen, want mensen nemen beslissingen op basis van
 * wat hier staat.
 *
 * Vorm: { title, intro, sections: [{ h, p: [...], list: [...] }] }
 * `p` is een alinea, `list` een opsomming. Een {site} of {email} in de tekst
 * wordt bij het renderen vervangen door de gegevens uit src/lib/site.js.
 */

export const legalNl = {
  /* ====================================================================== */
  privacy: {
    title: 'Privacyverklaring',
    intro:
      'Dit is een leeromgeving voor kinderen. Daarom houden we zo weinig mogelijk ' +
      'gegevens bij, en leggen we hieronder precies uit welke dat zijn, waarom we ze ' +
      'nodig hebben en hoe je ze weer kwijtraakt.',
    sections: [
      {
        h: 'Wie is verantwoordelijk',
        p: [
          '{legalName}, {address}, ondernemingsnummer {companyNumber}, is de verwerkingsverantwoordelijke voor de gegevens die via {appUrl} worden verwerkt.',
          'Vragen over je gegevens? Mail {email}. We antwoorden binnen 30 dagen, zoals de AVG voorschrijft.'
        ]
      },
      {
        h: 'Welke gegevens we bijhouden',
        p: ['We onderscheiden twee soorten gebruikers, omdat we van kinderen bewust minder weten.'],
        list: [
          'Van een leerkracht of beheerder: e-mailadres, naam, rol, en het moment waarop het account is aangemaakt.',
          'Van een kind: een voornaam en een wachtwoord, meer niet. We vragen geen e-mailadres van kinderen. Om technische redenen heeft elk account een adres nodig; voor kinderen maken we daarom een intern adres aan op een domein dat van niemand is (bijvoorbeeld emma@leerling.start2code.app). Daar komt nooit post aan en er wordt nooit iets heen gestuurd.',
          'Van iedereen: de projecten die je maakt (de titel, je Scratch- of Pythoncode, en het voorbeeldplaatje), welke lesstappen je hebt afgevinkt, en in welke klas je zit.',
          'Van een ingediend project: de beoordeling van de leerkracht — geslaagd of niet, een score, en de opmerkingen die de leerkracht erbij schrijft.',
          'Een korte activiteitenlijst: dat er een project is gemaakt, opgeslagen of uitgevoerd, met het tijdstip. Daar staat geen IP-adres, geen locatie en geen browsergegeven in.'
        ]
      },
      {
        h: 'Wat we niet doen',
        list: [
          'We verkopen of verhuren nooit gegevens, aan niemand.',
          'Er staat geen advertentienetwerk, geen trackingpixel en geen bezoekersstatistiek op deze site.',
          'We maken geen profielen en nemen geen geautomatiseerde beslissingen over kinderen.',
          'We sturen geen reclame. De enige mails die we versturen gaan over je eigen account: bevestigen dat je het bent, of een nieuw wachtwoord instellen.',
          'We vragen kinderen niet naar hun achternaam, adres, geboortedatum, telefoonnummer of foto.'
        ]
      },
      {
        h: 'Waarom we het mogen (de rechtsgrond)',
        p: [
          'Voor leerkrachten en scholen verwerken we gegevens om de overeenkomst uit te voeren die met CodeLab is gesloten: zonder account geen les.',
          'Voor kinderen gebeurt de verwerking in opdracht van de school, in het kader van het onderwijs dat de school verzorgt. De school vraagt de toestemming aan de ouders en bepaalt wie een account krijgt; wij maken geen accounts voor kinderen aan buiten de leerkracht om.',
          'Kinderen onder de 13 kunnen zich hier niet zelf registreren. Dat is een bewuste keuze: onder die leeftijd kan een kind in België niet rechtsgeldig zelf toestemming geven voor online diensten.'
        ]
      },
      {
        h: 'Camera en microfoon in Scratch',
        p: [
          'Scratch kan een geluid opnemen of de webcam gebruiken (het blok "videodetectie"). Dat gebeurt alleen als het kind er zelf voor kiest en de browser erom vraagt — wij zetten het nooit zelf aan.',
          'Videobeeld wordt uitsluitend in de browser gebruikt en verlaat het toestel niet. Een geluidsopname die het kind bewaart, wordt wel onderdeel van het project en komt dus mee in het opgeslagen bestand. Wil je dat niet, laat kinderen dan geen opnames bewaren, of verwijder het project.'
        ]
      },
      {
        h: 'Wie het nog meer ziet',
        p: ['Alleen wie het nodig heeft:'],
        list: [
          'De leerkracht van de klas ziet de projecten, de voortgang en de ingediende opdrachten van de kinderen in die klas.',
          'Een beheerder van {legalName} kan bij alle gegevens, om de dienst te kunnen onderhouden.',
          'Kinderen zien elkaars werk niet. Er is geen chat, geen profielpagina en geen publieke galerij.'
        ]
      },
      {
        h: 'Verwerkers en derde partijen',
        p: [
          'We besteden de techniek uit aan een klein aantal partijen. Met elk van hen geldt hun verwerkersovereenkomst; we geven hen nooit meer dan nodig.'
        ],
        list: [
          'Supabase — database, inloggen en bestandsopslag. Hier staan je account, je projecten en je voortgang. Regio: {dataRegion}.',
          'Hostinger — de webhosting waar de site zelf vandaan komt.',
          'PyScript (pyscript.net) — wordt opgehaald zodra je een Pythonproject opent. Je Python draait volledig in je eigen browser; je code wordt daar niet heen gestuurd. Omdat je browser het bestand ophaalt, ziet die partij wel je IP-adres.',
          'De Scratch-materiaalbibliotheek (scratch.mit.edu) — wordt aangesproken als je een figuur of achtergrond uit de bibliotheek kiest. Ook hier geldt: je browser haalt een plaatje op, dus dat adres ziet je IP-adres. Je project wordt er niet heen gestuurd.'
        ]
      },
      {
        h: 'Hoe lang we het bewaren',
        list: [
          'Je account en je projecten blijven bestaan zolang je ze wil houden.',
          'Vraagt de school of de leerkracht om een klas te verwijderen, dan verwijderen we de accounts van die kinderen en alles wat eraan hangt.',
          'Een account waarmee 24 maanden niet is ingelogd, verwijderen we.',
          'Verwijder je je account zelf, dan verdwijnen je projecten, je voortgang en je beoordelingen mee. Dat is onomkeerbaar.'
        ]
      },
      {
        h: 'Je rechten',
        p: [
          'Je mag je gegevens inzien, laten verbeteren, laten verwijderen, meenemen naar elders, of bezwaar maken tegen de verwerking. Voor een kind oefent de ouder of de school dat recht uit.',
          'Inzien en meenemen kan meteen zelf: log in en gebruik "Mijn gegevens" om alles als bestand te downloaden. Verwijderen kan daar ook, of via {email}.',
          'Ben je het niet eens met hoe we met je gegevens omgaan, dan mag je klacht indienen bij de {dpaName}, {dpaAddress} — {dpaUrl}.'
        ]
      },
      {
        h: 'Beveiliging',
        p: [
          'Al het verkeer loopt over https. Wachtwoorden worden nooit leesbaar opgeslagen. De database laat per regel alleen toe wat die ene gebruiker mag zien, en dat wordt afgedwongen door de database zelf en niet alleen door de app.',
          'Gaat er ondanks alles iets mis met persoonsgegevens, dan melden we dat binnen 72 uur bij de Gegevensbeschermingsautoriteit en lichten we de betrokken scholen in.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  terms: {
    title: 'Gebruiksvoorwaarden',
    intro: 'Korte afspraken over het gebruik van {name}.',
    sections: [
      {
        h: 'Wie we zijn',
        p: ['{name} wordt aangeboden door {legalName}, {address}, ondernemingsnummer {companyNumber}, bereikbaar op {email}.']
      },
      {
        h: 'Waarvoor de dienst dient',
        p: [
          '{name} is een leeromgeving waarin kinderen leren programmeren met Scratch en met Python. Toegang hoort bij de inschrijving voor de CodeLab-lessen via {parentUrl}.',
          'Op deze site zelf wordt niets verkocht en wordt nooit om een betaling gevraagd. Vraagt een scherm hier wél om je kaartgegevens, dan is dat niet van ons — sluit het en waarschuw {email}.'
        ]
      },
      {
        h: 'Accounts',
        list: [
          'Accounts voor kinderen worden aangemaakt door de leerkracht. Kinderen kunnen zich hier niet zelf registreren.',
          'Een leerkrachtaccount is persoonlijk. Deel je wachtwoord niet.',
          'Je bent zelf verantwoordelijk voor wat er met jouw account gebeurt. Denk je dat iemand anders erin kan, verander dan je wachtwoord en laat het ons weten.'
        ]
      },
      {
        h: 'Wat je maakt blijft van jou',
        p: [
          'De projecten die je maakt zijn van jou. Wij gebruiken ze alleen om de dienst te laten werken: opslaan, tonen aan jou, en tonen aan je leerkracht om ze te kunnen beoordelen.',
          'We publiceren het werk van een kind nergens en gebruiken het niet voor promotie.'
        ]
      },
      {
        h: 'Wat niet mag',
        list: [
          'Andermans account gebruiken, of proberen bij gegevens te komen die niet voor jou bedoeld zijn.',
          'De dienst overbelasten of de beveiliging omzeilen.',
          'Materiaal uploaden dat kwetsend of onwettig is, of waarvan je de rechten niet hebt.'
        ]
      },
      {
        h: 'Beschikbaarheid',
        p: [
          'We doen ons best om de dienst te laten draaien, maar beloven geen ononderbroken beschikbaarheid. Onderhoud, een storing bij een leverancier of een schoolnetwerk dat ons blokkeert kan de dienst tijdelijk onbereikbaar maken.',
          'Bewaar belangrijk werk ook buiten de site: bij elk project zit een downloadknop.'
        ]
      },
      {
        h: 'Aansprakelijkheid',
        p: [
          'We zijn aansprakelijk voor schade door opzet of grove nalatigheid van onze kant. Voor het overige is onze aansprakelijkheid beperkt tot wat voor de betrokken inschrijving is betaald.',
          'Niets in deze voorwaarden beperkt rechten die je als consument dwingend hebt.'
        ]
      },
      {
        h: 'Wijzigingen en toepasselijk recht',
        p: [
          'Veranderen deze voorwaarden wezenlijk, dan laten we dat bij het inloggen zien voor je verder gaat. De datum onderaan zegt wanneer deze versie is ingegaan.',
          'Op deze voorwaarden is het Belgisch recht van toepassing. Geschillen horen thuis bij de bevoegde rechtbanken in België.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  cookies: {
    title: 'Cookies en lokale opslag',
    intro:
      'Deze site gebruikt geen trackingcookies en geen advertentiecookies. Er staat geen ' +
      'bezoekersstatistiek op. Wat we wél opslaan staat hieronder, volledig.',
    sections: [
      {
        h: 'Eigenlijk geen cookies',
        p: [
          'We plaatsen geen enkele cookie. Wat de site bewaart, bewaart hij in de lokale opslag van je eigen browser. Dat gaat nooit automatisch mee met een verzoek naar een server, en het blijft op jouw toestel.',
          'Alles wat hieronder staat is noodzakelijk om de site te laten werken. Daarom vragen we er geen toestemming voor — die is er volgens de regels niet voor nodig. We vertellen je wel wat er staat, want daar heb je recht op.'
        ]
      },
      {
        h: 'Wat er precies wordt opgeslagen',
        list: [
          'sb-…-auth-token — je inlogsessie. Zonder dit moet je bij elke klik opnieuw inloggen. Blijft staan tot je uitlogt.',
          's2c:lang — de taal die je hebt gekozen, zodat de site de volgende keer meteen goed staat.',
          's2c:lesson-… — welke lesstappen je hebt afgevinkt, zodat het vinkje er meteen staat. Hetzelfde staat ook in de database, zodat je het op een andere computer terugvindt.',
          's2c:cookie-notice — dat je deze melding hebt gelezen, zodat we hem niet blijven tonen.',
          's2c-use-proxy — alleen als het netwerk van je school onze database blokkeert: de notitie dat we de omweg moeten nemen. Verdwijnt als je het tabblad sluit.',
          's2c:recovering — een tijdelijke notitie bij een mislukte pagina-lading, zodat de site zichzelf één keer kan herladen. Verdwijnt als je het tabblad sluit.'
        ]
      },
      {
        h: 'Wissen',
        p: [
          'Je kunt dit altijd zelf wissen via de instellingen van je browser ("sitegegevens wissen"). Je wordt dan uitgelogd en de site staat weer in het Nederlands; verder gaat er niets verloren, want je werk staat in de database.'
        ]
      },
      {
        h: 'Van buitenaf opgehaald',
        p: [
          'Twee onderdelen worden bij een ander adres opgehaald, en alleen wanneer je ze nodig hebt. Die partij ziet dan je IP-adres, net als bij elk plaatje op het internet. Ze zetten geen cookie en krijgen je werk niet te zien.'
        ],
        list: [
          'pyscript.net — zodra je een Pythonproject opent.',
          'scratch.mit.edu — zodra je een figuur of achtergrond uit de Scratch-bibliotheek kiest.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  refund: {
    title: 'Betalingen en terugbetaling',
    intro: 'Kort: op deze site betaal je niets.',
    sections: [
      {
        h: 'Er wordt hier niets aangerekend',
        p: [
          'Op {appUrl} kun je niets kopen. Er zijn geen abonnementen, geen tegoeden, geen extra opties tegen betaling en geen kosten die later opduiken. Alles wat je in de app ziet, hoort bij je toegang.',
          'Toegang tot {name} hoort bij de inschrijving voor de CodeLab-lessen via {parentUrl}. De betaling gebeurt daar, bij die inschrijving.'
        ]
      },
      {
        h: 'Terugbetaling',
        p: [
          'Omdat de betaling bij de inschrijving voor de lessen hoort, gelden de voorwaarden van die inschrijving, ook voor terugbetaling en annulering. Je vindt ze op {parentUrl}, of vraag ze op via {email}.',
          'Stopt de inschrijving, dan stopt de toegang tot {name}. Vraag je werk vooraf op: bij elk project zit een downloadknop, en onder "Mijn gegevens" kun je alles in één keer downloaden.'
        ]
      },
      {
        h: 'Als wij ermee stoppen',
        p: [
          'Zouden we {name} ooit stopzetten, dan melden we dat minstens 30 dagen vooraf aan de ingeschreven scholen, zodat er tijd is om al het werk te downloaden.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  accessibility: {
    title: 'Toegankelijkheid',
    intro:
      'Deze site wordt gebruikt door kinderen, en die verschillen onderling meer dan ' +
      'volwassenen. Hieronder staat eerlijk wat er werkt en wat nog niet.',
    sections: [
      {
        h: 'Waar we naar streven',
        p: ['WCAG 2.1 niveau AA. Daar zijn we nog niet overal, maar het is de lat.']
      },
      {
        h: 'Wat werkt',
        list: [
          'Je kunt de hele site met het toetsenbord bedienen. Waar je bent is altijd zichtbaar aan een duidelijke rand.',
          'Bovenaan elke pagina staat een link waarmee je de navigatie overslaat. Je ziet hem zodra je met Tab begint.',
          'Tekst en knoppen halen de contrastverhouding van 4,5:1 die de norm vraagt.',
          'Je kunt inzoomen tot 200% zonder dat er iets wegvalt.',
          'Zet je in je besturingssysteem "minder beweging" aan, dan houdt de site op met bewegen.',
          'De taal staat per pagina ingesteld, zodat een voorleesprogramma de juiste uitspraak kiest.'
        ]
      },
      {
        h: 'Wat nog niet goed werkt',
        list: [
          'De Scratch-editor komt van het Scratch-team zelf. Die is maar beperkt met het toetsenbord te bedienen: blokken slepen gaat met de muis. Wij kunnen dat niet oplossen zonder Scratch zelf te herschrijven.',
          'Het speelveld van een Pythonspel is beeld; wat daarin gebeurt kan een voorleesprogramma niet volgen.',
          'Een deel van de leerkrachtschermen is nog niet vertaald en staat in het Engels.'
        ]
      },
      {
        h: 'Iets gevonden?',
        p: [
          'Loop je ergens vast, mail dan {email} en beschrijf waar het misging. We nemen dat serieus en antwoorden binnen 30 dagen.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  licenses: {
    title: 'Gebruikt materiaal en licenties',
    intro: 'Wat we van anderen gebruiken, en onder welke voorwaarden.',
    sections: [
      {
        h: 'Scratch',
        p: [
          'De blokkeneditor is Scratch, gemaakt door de Lifelong Kindergarten Group van het MIT Media Lab. De programmacode staat onder de BSD 3-Clause-licentie; de figuren, achtergronden en geluiden uit de bibliotheek staan onder Creative Commons BY-SA 4.0.',
          'Scratch is een handelsmerk van het MIT. Deze site is niet gemaakt door, niet verbonden met en niet goedgekeurd door Scratch of het MIT.'
        ]
      },
      {
        h: 'Python in de browser',
        p: [
          'Python draait in je browser via PyScript en Pyodide (beide Apache 2.0), die CPython (PSF-licentie) en pygame-ce (LGPL 2.1) meebrengen.'
        ]
      },
      {
        h: 'Lettertypen',
        p: [
          'Inter (Rasmus Andersson) en JetBrains Mono (JetBrains) staan allebei onder de SIL Open Font License 1.1. Ze worden vanaf onze eigen server geladen, niet vanaf een lettertypedienst — zo gaat er bij het laden van een bladzijde niets over jou naar een derde partij.',
          'De volledige licentietekst staat bij de lettertypen zelf, op /fonts/OFL.txt.'
        ]
      },
      {
        h: 'Beeld',
        p: [
          'Het logo is in opdracht van {legalName} gemaakt en is eigendom van {legalName}.',
          'De symbolen in de app zijn emoji. Die worden door je eigen besturingssysteem getekend; wij leveren er geen afbeelding voor mee.'
        ]
      },
      {
        h: 'En verder',
        p: [
          'De app zelf draait op React (MIT), React Router (MIT), Vite (MIT) en de Supabase-bibliotheek (MIT). De volledige lijst met versies zit in package.json in de broncode.'
        ]
      }
    ]
  },

  /* ====================================================================== */
  deletion: {
    title: 'Gegevens laten verwijderen',
    intro:
      'Je hebt het recht om je gegevens te laten wissen, en dat moet eenvoudig zijn. ' +
      'Hieronder staan de drie manieren, van snelst naar traagst.',
    sections: [
      {
        h: 'Zelf, meteen',
        p: [
          'Log in en ga naar "Mijn gegevens". Daar staan twee knoppen: één om alles te downloaden, en één om je account definitief te verwijderen.',
          'Verwijderen wist je account, je projecten, je voortgang, je ingediende werk en de beoordelingen die daarbij horen. Het kan niet ongedaan worden gemaakt, dus download eerst wat je wil houden.'
        ]
      },
      {
        h: 'Voor een kind',
        p: [
          'De leerkracht kan een kind uit de klas halen en het account verwijderen. Ouders die dat willen, vragen het aan de leerkracht of rechtstreeks aan ons.'
        ]
      },
      {
        h: 'Per mail',
        p: [
          'Mail {email} met de voornaam of het e-mailadres van het account. Om te vermijden dat we het verkeerde account wissen, vragen we één keer om een bevestiging.',
          'We verwerken het verzoek binnen 30 dagen en laten weten wanneer het gebeurd is. Dit kost niets.'
        ]
      },
      {
        h: 'Wat er daarna nog kan bestaan',
        p: [
          'Reservekopieën van de database worden automatisch na 30 dagen overschreven. In die periode kan je gegeven daar nog in zitten; we zetten een reservekopie nooit terug om verwijderde gegevens op te halen.'
        ]
      }
    ]
  }
}
