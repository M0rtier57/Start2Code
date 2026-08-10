/**
 * The Python track.
 *
 * Titles, blurbs and steps are written per language as { nl, en }; the current
 * one is chosen by `pick()` from the i18n context.
 *
 * The starter code is shared between languages, with its comments in Dutch —
 * the main language of the platform. Duplicating every program would double
 * this file for very little gain; the code itself is identical either way.
 *
 * Lessons 1-6 run in console mode (fast to start, no pygame download); from
 * lesson 7 on the code runs on the pygame stage.
 *
 * Note: the browser build of pygame has no system fonts, so all examples use
 * pygame.font.Font(None, size) rather than SysFont.
 */

export const pythonLessons = [
  {
    id: 'py-01-hello',
    minutes: 10,
    mode: 'console',
    concepts: ['print'],
    title: { nl: 'Zeg hallo', en: 'Say hello' },
    blurb: { nl: 'Je allereerste Python-programma.', en: 'Your very first Python program.' },
    steps: {
      nl: [
        'Druk op ▶ Start en kijk naar de console onderaan.',
        'Verander de woorden tussen de aanhalingstekens en start opnieuw.',
        'Voeg een tweede `print(...)` toe met je lievelingseten.',
        'Haal eens één aanhalingsteken weg en start: lees de fout en herstel ze.'
      ],
      en: [
        'Press ▶ Run and watch the console at the bottom.',
        'Change the words inside the quotes and run it again.',
        'Add a second `print(...)` line with your favourite food.',
        'Try removing one quote mark and run it — read the error, then fix it.'
      ]
    },
    starter: `# Alles na een # is een notitie voor mensen, niet voor de computer.
print("Hallo! Ik heet ...")
print("Ik leer Python.")
`
  },
  {
    id: 'py-02-variables',
    minutes: 12,
    mode: 'console',
    concepts: ['variables', 'f-strings'],
    title: { nl: 'Doosjes die variabelen heten', en: 'Boxes called variables' },
    blurb: {
      nl: 'Bewaar dingen zodat je ze opnieuw kan gebruiken.',
      en: 'Store things so you can use them again.'
    },
    steps: {
      nl: [
        'Verander `naam` en `leeftijd` in die van jezelf.',
        'Maak een nieuwe variabele `huisdier` en print ze.',
        'Tel 10 bij `leeftijd` op en print "Over 10 jaar ben ik ...".',
        'Merk op: tekst staat tussen aanhalingstekens, getallen niet.'
      ],
      en: [
        'Change `naam` and `leeftijd` to your own.',
        'Make a new variable `huisdier` and print it.',
        'Add 10 to `leeftijd` and print "In 10 years I will be ...".',
        'Notice that text goes in quotes but numbers do not.'
      ]
    },
    starter: `naam = "Sam"
leeftijd = 11

# Met een f-string zet je een variabele zo in een zin.
print(f"Hoi {naam}, je bent {leeftijd} jaar!")
print(f"Volgend jaar word je {leeftijd + 1}.")
`
  },
  {
    id: 'py-03-input',
    minutes: 12,
    mode: 'console',
    concepts: ['input', 'int()'],
    title: { nl: 'Stel een vraag', en: 'Ask a question' },
    blurb: {
      nl: 'Laat het programma met jou praten.',
      en: 'Make the program talk back to you.'
    },
    steps: {
      nl: [
        'Start het — er verschijnt een venstertje dat je naam vraagt.',
        'Stel nog een vraag en print het antwoord.',
        'Onthou: `input` geeft altijd tekst terug.',
        'Gebruik `int(...)` om tekst om te zetten naar een getal om mee te rekenen.'
      ],
      en: [
        'Run it — a box pops up asking for your name.',
        'Ask one more question and print the answer.',
        'Remember: `input` always gives back text.',
        'Use `int(...)` to turn text into a number you can do maths with.'
      ]
    },
    starter: `naam = input("Hoe heet je? ")
print("Aangenaam, " + naam + "!")

leeftijd = int(input("Hoe oud ben je? "))
print(f"Over 5 jaar ben je {leeftijd + 5}.")
`
  },
  {
    id: 'py-04-if',
    minutes: 15,
    mode: 'console',
    concepts: ['if', 'elif', 'else', 'comparison'],
    title: { nl: 'Keuzes maken', en: 'Making choices' },
    blurb: { nl: 'Doe dit, of anders dat.', en: 'Do one thing, or something else.' },
    steps: {
      nl: [
        'Start het een paar keer met verschillende getallen.',
        'Alles wat ingesprongen staat onder `if` gebeurt enkel als het klopt.',
        'Voeg een `elif` toe voor precies 100.',
        'Verzin je eigen regel — bijvoorbeeld: is een getal even? (`getal % 2 == 0`)'
      ],
      en: [
        'Run it a few times with different numbers.',
        'Everything indented under `if` only happens when it is true.',
        'Add an `elif` for exactly 100.',
        'Make your own rule — for example, is a number even? (`getal % 2 == 0`)'
      ]
    },
    starter: `getal = int(input("Kies een getal: "))

if getal > 100:
    print("Dat is een groot getal!")
elif getal < 0:
    print("Dat is onder nul!")
else:
    print("Een mooi gewoon getal.")
`
  },
  {
    id: 'py-05-loops',
    minutes: 15,
    mode: 'console',
    concepts: ['for', 'range', 'while'],
    title: { nl: 'Nog eens en nog eens', en: 'Doing it again' },
    blurb: {
      nl: 'Laat de computer het saaie werk herhalen.',
      en: 'Let the computer repeat the boring parts.'
    },
    steps: {
      nl: [
        'Start het en tel de regels die verschijnen.',
        'Verander `range(5)` in `range(10)`.',
        'Lussen tellen vanaf 0 — kijk naar het eerste getal.',
        'Schrijf een lus die de tafel van 7 print.'
      ],
      en: [
        'Run it and count the lines that appear.',
        'Change `range(5)` to `range(10)`.',
        'Loops start counting at 0 — check the first number printed.',
        'Write a loop that prints the 7 times table.'
      ]
    },
    starter: `for i in range(5):
    print(f"Ronde {i}")

print("Start!")

teller = 3
while teller > 0:
    print(teller)
    teller = teller - 1
`
  },
  {
    id: 'py-06-lists',
    minutes: 18,
    mode: 'console',
    concepts: ['lists', 'def', 'return'],
    title: { nl: 'Lijsten en functies', en: 'Lists and functions' },
    blurb: {
      nl: 'Hou veel dingen samen, en verzin je eigen commando.',
      en: 'Keep many things together, and name your own commands.'
    },
    steps: {
      nl: [
        'Voeg nog twee dieren toe aan de lijst.',
        'Print enkel het eerste dier met `dieren[0]`.',
        'Roep `groet(...)` op met een andere naam.',
        'Schrijf je eigen functie die twee getallen optelt en het antwoord teruggeeft.'
      ],
      en: [
        'Add two more animals to the list.',
        'Print only the first animal with `dieren[0]`.',
        'Call `groet(...)` with a different name.',
        'Write your own function that adds two numbers and returns the answer.'
      ]
    },
    starter: `dieren = ["kat", "hond", "vos"]

for dier in dieren:
    print(f"Ik hou van de {dier}")

print(f"Er zijn {len(dieren)} dieren.")


def groet(wie):
    return f"Hallo {wie}, welkom!"


print(groet("Alex"))
`
  },
  {
    id: 'py-07-window',
    minutes: 20,
    mode: 'game',
    concepts: ['pygame', 'game loop', 'colours'],
    title: { nl: 'Je eerste spelvenster', en: 'Your first game window' },
    blurb: {
      nl: 'Open een echt spelvenster met pygame.',
      en: 'Open a real game window with pygame.'
    },
    steps: {
      nl: [
        'Start het — rechts verschijnt een venster.',
        'Verander de kleurgetallen van de achtergrond (rood, groen, blauw — elk 0 tot 255).',
        'Verander de tekst die getekend wordt.',
        'Elk spel herhaalt: gebeurtenissen → tekenen → flip. Zoek die drie stukken.'
      ],
      en: [
        'Run it — a window appears on the right.',
        'Change the background colour numbers (red, green, blue — each 0 to 255).',
        'Change the text that is drawn.',
        'Every game repeats: handle events → draw → flip. Find those three parts.'
      ]
    },
    starter: `import pygame
import asyncio

pygame.init()
scherm = pygame.display.set_mode((1280, 720))
pygame.display.set_caption("Mijn eerste venster")

ACHTERGROND = (25, 28, 38)
WIT = (255, 255, 255)


async def main():
    lettertype = pygame.font.Font(None, 90)
    tekst = lettertype.render("Hallo, spel!", True, WIT)
    bezig = True

    while bezig:
        for gebeurtenis in pygame.event.get():
            if gebeurtenis.type == pygame.QUIT:
                bezig = False

        scherm.fill(ACHTERGROND)
        scherm.blit(tekst, tekst.get_rect(center=(640, 360)))

        pygame.display.flip()
        await asyncio.sleep(0)   # laat de browser even ademen - altijd laten staan

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-08-shapes',
    minutes: 20,
    mode: 'game',
    concepts: ['draw.rect', 'draw.circle', 'coordinates'],
    title: { nl: 'Vormen tekenen', en: 'Drawing shapes' },
    blurb: { nl: 'Rechthoeken, cirkels en lijnen.', en: 'Rectangles, circles and lines.' },
    steps: {
      nl: [
        'x gaat naar rechts, y gaat naar BENEDEN. Verplaats de cirkel met andere getallen.',
        'Voeg een tweede cirkel toe in een andere kleur.',
        'Maak de rechthoek breder.',
        'Teken een gezicht: twee ogen en een mond.'
      ],
      en: [
        'x goes right, y goes DOWN. Move the circle by changing its numbers.',
        'Add a second circle in a different colour.',
        'Make the rectangle wider.',
        'Draw a simple face: two eyes and a mouth.'
      ]
    },
    starter: `import pygame
import asyncio

pygame.init()
scherm = pygame.display.set_mode((1280, 720))

ACHTERGROND = (18, 20, 28)
ROOD = (220, 53, 69)
BLAUW = (77, 171, 247)
GEEL = (255, 212, 59)


async def main():
    bezig = True
    while bezig:
        for gebeurtenis in pygame.event.get():
            if gebeurtenis.type == pygame.QUIT:
                bezig = False

        scherm.fill(ACHTERGROND)

        # rechthoek: (links, boven, breedte, hoogte)
        pygame.draw.rect(scherm, ROOD, (100, 100, 300, 180), border_radius=16)

        # cirkel: (midden x, midden y), straal
        pygame.draw.circle(scherm, GEEL, (800, 300), 90)

        # lijn: startpunt, eindpunt, dikte
        pygame.draw.line(scherm, BLAUW, (100, 500), (1100, 500), 8)

        pygame.display.flip()
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-09-move',
    minutes: 25,
    mode: 'game',
    concepts: ['get_pressed', 'movement', 'boundaries'],
    title: { nl: 'Bewegen met de pijltjestoetsen', en: 'Moving with the arrow keys' },
    blurb: {
      nl: 'Neem zelf de controle over iets op het scherm.',
      en: 'Take control of something on screen.'
    },
    steps: {
      nl: [
        'Start het en druk op de pijltjestoetsen.',
        'Maak de speler sneller door `snelheid` te veranderen.',
        'De `if`-regels houden de speler op het scherm — probeer er eens één weg te halen.',
        'Laat de speler van kleur veranderen terwijl hij beweegt.'
      ],
      en: [
        'Run it and press the arrow keys.',
        'Make the player faster by changing `snelheid`.',
        'The `if` lines stop the player leaving the screen — try deleting one.',
        'Make the player change colour while it is moving.'
      ]
    },
    starter: `import pygame
import asyncio

pygame.init()
scherm = pygame.display.set_mode((1280, 720))
klok = pygame.time.Clock()

ACHTERGROND = (18, 20, 28)
GROEN = (81, 207, 102)

x = 640
y = 360
grootte = 60
snelheid = 7


async def main():
    global x, y
    bezig = True

    while bezig:
        for gebeurtenis in pygame.event.get():
            if gebeurtenis.type == pygame.QUIT:
                bezig = False

        toetsen = pygame.key.get_pressed()
        if toetsen[pygame.K_LEFT]:
            x = x - snelheid
        if toetsen[pygame.K_RIGHT]:
            x = x + snelheid
        if toetsen[pygame.K_UP]:
            y = y - snelheid
        if toetsen[pygame.K_DOWN]:
            y = y + snelheid

        # Hou de speler op het scherm.
        if x < 0:
            x = 0
        if x > 1280 - grootte:
            x = 1280 - grootte
        if y < 0:
            y = 0
        if y > 720 - grootte:
            y = 720 - grootte

        scherm.fill(ACHTERGROND)
        pygame.draw.rect(scherm, GROEN, (x, y, grootte, grootte), border_radius=10)

        pygame.display.flip()
        klok.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-10-catch',
    minutes: 35,
    mode: 'game',
    concepts: ['Rect', 'collision', 'score', 'random'],
    title: { nl: 'Vang de vallende ster', en: 'Catch the falling star' },
    blurb: {
      nl: 'Een echt spelletje: botsingen, punten en snelheid.',
      en: 'A whole little game: collisions, score and speed.'
    },
    steps: {
      nl: [
        'Speel het — beweeg met de pijltjes en vang de sterren.',
        'Zoek waar de score omhoog gaat en maak een vangst 5 punten waard.',
        'Laat de ster sneller vallen na elke vangst.',
        'Voeg een tweede ster toe in een andere kleur.',
        'Voeg een tijd toe, of een leven dat je verliest als je een ster mist.'
      ],
      en: [
        'Play it — move with the arrow keys and catch the stars.',
        'Find where the score goes up and make a catch worth 5 points.',
        'Make the star fall faster each time it is caught.',
        'Add a second star in a different colour.',
        'Add a timer, or a life you lose when a star is missed.'
      ]
    },
    starter: `import pygame
import asyncio
import random

pygame.init()
scherm = pygame.display.set_mode((1280, 720))
klok = pygame.time.Clock()

ACHTERGROND = (18, 20, 28)
GROEN = (81, 207, 102)
GEEL = (255, 212, 59)
WIT = (255, 255, 255)

speler = pygame.Rect(600, 640, 120, 24)
ster = pygame.Rect(random.randint(0, 1240), -40, 40, 40)
stersnelheid = 5
score = 0


async def main():
    global ster, stersnelheid, score
    lettertype = pygame.font.Font(None, 48)
    bezig = True

    while bezig:
        for gebeurtenis in pygame.event.get():
            if gebeurtenis.type == pygame.QUIT:
                bezig = False

        toetsen = pygame.key.get_pressed()
        if toetsen[pygame.K_LEFT]:
            speler.x = speler.x - 9
        if toetsen[pygame.K_RIGHT]:
            speler.x = speler.x + 9
        speler.clamp_ip(scherm.get_rect())

        ster.y = ster.y + stersnelheid

        # Gevangen?
        if speler.colliderect(ster):
            score = score + 1
            ster.y = -40
            ster.x = random.randint(0, 1240)

        # Gemist - terug naar boven.
        if ster.top > 720:
            ster.y = -40
            ster.x = random.randint(0, 1240)

        scherm.fill(ACHTERGROND)
        pygame.draw.rect(scherm, GROEN, speler, border_radius=8)
        pygame.draw.rect(scherm, GEEL, ster, border_radius=8)
        scherm.blit(lettertype.render(f"Score: {score}", True, WIT), (24, 24))

        pygame.display.flip()
        klok.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  }
]

export const BLANK_PYTHON = `print("Hallo!")
`

export const BLANK_PYGAME = pythonLessons.find((lesson) => lesson.id === 'py-07-window').starter
