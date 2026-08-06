/**
 * The Python track.
 *
 * Lessons 1-6 run in console mode (fast to start, no pygame download); from
 * lesson 7 on the code runs on the pygame stage. `starter` is what a new
 * project opens with, and every step is something the child can tick off.
 *
 * Note: the browser build of pygame has no system fonts, so all examples use
 * pygame.font.Font(None, size) rather than SysFont.
 */

export const pythonLessons = [
  {
    id: 'py-01-hello',
    title: 'Say hello',
    blurb: 'Your very first Python program.',
    minutes: 10,
    mode: 'console',
    concepts: ['print'],
    steps: [
      'Press ▶ Run and watch the console at the bottom.',
      'Change the words inside the quotes and run it again.',
      'Add a second `print(...)` line with your favourite food.',
      'Try removing one quote mark and run it — read the error, then fix it.'
    ],
    starter: `# Anything after a # is a note for humans, not for the computer.
print("Hello! My name is ...")
print("I am learning Python.")
`
  },
  {
    id: 'py-02-variables',
    title: 'Boxes called variables',
    blurb: 'Store things so you can use them again.',
    minutes: 12,
    mode: 'console',
    concepts: ['variables', 'f-strings'],
    steps: [
      'Change `name` and `age` to your own.',
      'Make a new variable `pet` and print it.',
      'Add 10 to `age` and print "In 10 years I will be ...".',
      'Notice that text goes in quotes but numbers do not.'
    ],
    starter: `name = "Sam"
age = 11

# An f-string lets you drop a variable straight into text.
print(f"Hi {name}, you are {age} years old!")
print(f"Next year you will be {age + 1}.")
`
  },
  {
    id: 'py-03-input',
    title: 'Ask a question',
    blurb: 'Make the program talk back to you.',
    minutes: 12,
    mode: 'console',
    concepts: ['input', 'int()'],
    steps: [
      'Run it — a box pops up asking for your name.',
      'Ask one more question and print the answer.',
      'Remember: `input` always gives back text.',
      'Use `int(...)` to turn text into a number you can do maths with.'
    ],
    starter: `name = input("What is your name? ")
print("Nice to meet you, " + name + "!")

age = int(input("How old are you? "))
print(f"In 5 years you will be {age + 5}.")
`
  },
  {
    id: 'py-04-if',
    title: 'Making choices',
    blurb: 'Do one thing, or something else.',
    minutes: 15,
    mode: 'console',
    concepts: ['if', 'elif', 'else', 'comparison'],
    steps: [
      'Run it a few times with different numbers.',
      'Everything indented under `if` only happens when it is true.',
      'Add an `elif` for exactly 100.',
      'Make your own rule — for example, is a number even? (`number % 2 == 0`)'
    ],
    starter: `number = int(input("Pick a number: "))

if number > 100:
    print("That is a big number!")
elif number < 0:
    print("That is below zero!")
else:
    print("A nice normal number.")
`
  },
  {
    id: 'py-05-loops',
    title: 'Doing it again',
    blurb: 'Let the computer repeat the boring parts.',
    minutes: 15,
    mode: 'console',
    concepts: ['for', 'range', 'while'],
    steps: [
      'Run it and count the lines that appear.',
      'Change `range(5)` to `range(10)`.',
      'Loops start counting at 0 — check the first number printed.',
      'Write a loop that prints the 7 times table.'
    ],
    starter: `for i in range(5):
    print(f"Loop number {i}")

print("Blast off!")

count = 3
while count > 0:
    print(count)
    count = count - 1
`
  },
  {
    id: 'py-06-lists',
    title: 'Lists and functions',
    blurb: 'Keep many things together, and name your own commands.',
    minutes: 18,
    mode: 'console',
    concepts: ['lists', 'def', 'return'],
    steps: [
      'Add two more animals to the list.',
      'Print only the first animal with `animals[0]`.',
      'Call `greet(...)` with a different name.',
      'Write your own function that adds two numbers and returns the answer.'
    ],
    starter: `animals = ["cat", "dog", "fox"]

for animal in animals:
    print(f"I like the {animal}")

print(f"There are {len(animals)} animals.")


def greet(who):
    return f"Hello {who}, welcome!"


print(greet("Alex"))
`
  },
  {
    id: 'py-07-window',
    title: 'Your first game window',
    blurb: 'Open a real game window with pygame.',
    minutes: 20,
    mode: 'game',
    concepts: ['pygame', 'game loop', 'colours'],
    steps: [
      'Run it — a window appears on the right.',
      'Change the background colour numbers (red, green, blue — each 0 to 255).',
      'Change the text that is drawn.',
      'Every game repeats: handle events → draw → flip. Find those three parts.'
    ],
    starter: `import pygame
import asyncio

pygame.init()
screen = pygame.display.set_mode((1280, 720))
pygame.display.set_caption("My first window")

BACKGROUND = (25, 28, 38)
WHITE = (255, 255, 255)


async def main():
    font = pygame.font.Font(None, 90)
    label = font.render("Hello, game!", True, WHITE)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        screen.fill(BACKGROUND)
        screen.blit(label, label.get_rect(center=(640, 360)))

        pygame.display.flip()
        await asyncio.sleep(0)   # lets the browser breathe - always keep this

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-08-shapes',
    title: 'Drawing shapes',
    blurb: 'Rectangles, circles and lines.',
    minutes: 20,
    mode: 'game',
    concepts: ['draw.rect', 'draw.circle', 'coordinates'],
    steps: [
      'x goes right, y goes DOWN. Move the circle by changing its numbers.',
      'Add a second circle in a different colour.',
      'Make the rectangle wider.',
      'Draw a simple face: two eyes and a mouth.'
    ],
    starter: `import pygame
import asyncio

pygame.init()
screen = pygame.display.set_mode((1280, 720))

BACKGROUND = (18, 20, 28)
RED = (220, 53, 69)
BLUE = (77, 171, 247)
YELLOW = (255, 212, 59)


async def main():
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        screen.fill(BACKGROUND)

        # rectangle: (left, top, width, height)
        pygame.draw.rect(screen, RED, (100, 100, 300, 180), border_radius=16)

        # circle: (centre x, centre y), radius
        pygame.draw.circle(screen, YELLOW, (800, 300), 90)

        # line: start point, end point, thickness
        pygame.draw.line(screen, BLUE, (100, 500), (1100, 500), 8)

        pygame.display.flip()
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-09-move',
    title: 'Moving with the arrow keys',
    blurb: 'Take control of something on screen.',
    minutes: 25,
    mode: 'game',
    concepts: ['get_pressed', 'movement', 'boundaries'],
    steps: [
      'Run it and press the arrow keys.',
      'Make the player faster by changing `speed`.',
      'The `if` lines stop the player leaving the screen — try deleting one.',
      'Make the player change colour while it is moving.'
    ],
    starter: `import pygame
import asyncio

pygame.init()
screen = pygame.display.set_mode((1280, 720))
clock = pygame.time.Clock()

BACKGROUND = (18, 20, 28)
GREEN = (81, 207, 102)

x = 640
y = 360
size = 60
speed = 7


async def main():
    global x, y
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            x = x - speed
        if keys[pygame.K_RIGHT]:
            x = x + speed
        if keys[pygame.K_UP]:
            y = y - speed
        if keys[pygame.K_DOWN]:
            y = y + speed

        # Keep the player on the screen.
        if x < 0:
            x = 0
        if x > 1280 - size:
            x = 1280 - size
        if y < 0:
            y = 0
        if y > 720 - size:
            y = 720 - size

        screen.fill(BACKGROUND)
        pygame.draw.rect(screen, GREEN, (x, y, size, size), border_radius=10)

        pygame.display.flip()
        clock.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  },
  {
    id: 'py-10-catch',
    title: 'Catch the falling star',
    blurb: 'A whole little game: collisions, score and speed.',
    minutes: 35,
    mode: 'game',
    concepts: ['Rect', 'collision', 'score', 'random'],
    steps: [
      'Play it — move with the arrow keys and catch the stars.',
      'Find where the score goes up and make a catch worth 5 points.',
      'Make the star fall faster each time it is caught.',
      'Add a second star in a different colour.',
      'Add a timer, or a life you lose when a star is missed.'
    ],
    starter: `import pygame
import asyncio
import random

pygame.init()
screen = pygame.display.set_mode((1280, 720))
clock = pygame.time.Clock()

BACKGROUND = (18, 20, 28)
GREEN = (81, 207, 102)
YELLOW = (255, 212, 59)
WHITE = (255, 255, 255)

player = pygame.Rect(600, 640, 120, 24)
star = pygame.Rect(random.randint(0, 1240), -40, 40, 40)
star_speed = 5
score = 0


async def main():
    global star, star_speed, score
    font = pygame.font.Font(None, 48)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            player.x = player.x - 9
        if keys[pygame.K_RIGHT]:
            player.x = player.x + 9
        player.clamp_ip(screen.get_rect())

        star.y = star.y + star_speed

        # Caught it?
        if player.colliderect(star):
            score = score + 1
            star.y = -40
            star.x = random.randint(0, 1240)

        # Missed it - send it back to the top.
        if star.top > 720:
            star.y = -40
            star.x = random.randint(0, 1240)

        screen.fill(BACKGROUND)
        pygame.draw.rect(screen, GREEN, player, border_radius=8)
        pygame.draw.rect(screen, YELLOW, star, border_radius=8)
        screen.blit(font.render(f"Score: {score}", True, WHITE), (24, 24))

        pygame.display.flip()
        clock.tick(60)
        await asyncio.sleep(0)

    pygame.quit()


asyncio.run(main())
`
  }
]

export const BLANK_PYTHON = `print("Hello!")
`

export const BLANK_PYGAME = pythonLessons.find((lesson) => lesson.id === 'py-07-window').starter
