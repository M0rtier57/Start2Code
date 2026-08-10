/**
 * The Scratch track.
 *
 * Titles, blurbs and steps are written per language as { nl, en }; the current
 * one is chosen by `pick()` from the i18n context. Scratch itself follows the
 * browser's language, so the block names below match what a Dutch child sees.
 *
 * Steps that name a specific block carry a `check`: the VM is asked which
 * opcodes the child actually used, and the box ticks itself. Steps that call for
 * judgement ("try a different colour") stay hand-ticked.
 */

export const scratchLessons = [
  {
    id: 'sc-01-move',
    minutes: 10,
    concepts: ['events', 'motion'],
    title: { nl: 'Laat de kat bewegen', en: 'Make the cat move' },
    blurb: {
      nl: 'Je eerste blokken: klik op de vlag en er gebeurt iets.',
      en: 'Your first blocks: click the flag and something happens.'
    },
    steps: {
      nl: [
        { text: 'Sleep het blok `wanneer groene vlag wordt aangeklikt` uit Gebeurtenissen naar het lege veld.', check: { block: 'event_whenflagclicked' } },
        { text: 'Klik `neem 10 stappen` uit Beweging er onderaan tegen.', check: { block: 'motion_movesteps' } },
        'Klik op de groene vlag. De kat beweegt een klein stukje!',
        'Verander 10 in 100 en klik nog eens op de vlag.'
      ],
      en: [
        { text: 'Drag a `when green flag clicked` block from Events onto the empty area.', check: { block: 'event_whenflagclicked' } },
        { text: 'Snap `move 10 steps` from Motion underneath it.', check: { block: 'motion_movesteps' } },
        'Click the green flag. The cat moves a little!',
        'Change 10 into 100 and click the flag again.'
      ]
    }
  },
  {
    id: 'sc-02-loop',
    minutes: 12,
    concepts: ['control', 'repeat', 'forever'],
    title: { nl: 'Herhalen en glijden', en: 'Loops and glide' },
    blurb: {
      nl: 'Herhaal blokken zodat de kat blijft doorgaan.',
      en: 'Repeat blocks so the cat keeps going.'
    },
    steps: {
      nl: [
        { text: 'Zet een `herhaal 10` blok uit Besturen rond je beweeg-blok.', check: { block: 'control_repeat' } },
        { text: 'Zet `neem 10 stappen` binnen in de herhaling.', check: { block: 'motion_movesteps', inside: 'control_repeat' } },
        { text: 'Voeg `keer om aan de rand` toe uit Beweging.', check: { block: 'motion_ifonedgebounce' } },
        { text: 'Vervang `herhaal 10` door `herhaal` en kijk hoe de kat blijft stuiteren.', check: { block: 'control_forever' } }
      ],
      en: [
        { text: 'Add a `repeat 10` block from Control around your move block.', check: { block: 'control_repeat' } },
        { text: 'Put `move 10 steps` inside the repeat.', check: { block: 'motion_movesteps', inside: 'control_repeat' } },
        { text: 'Add `if on edge, bounce` from Motion.', check: { block: 'motion_ifonedgebounce' } },
        { text: 'Swap `repeat 10` for `forever` and watch the cat bounce for ever.', check: { block: 'control_forever' } }
      ]
    }
  },
  {
    id: 'sc-03-looks',
    minutes: 12,
    concepts: ['looks', 'costumes', 'wait'],
    title: { nl: 'Praten en uiterlijken', en: 'Talking and costumes' },
    blurb: {
      nl: 'Laat je sprite praten en er anders uitzien.',
      en: 'Make your sprite speak and change how it looks.'
    },
    steps: {
      nl: [
        { text: 'Voeg `zeg Hallo! 2 seconden` toe uit Uiterlijken.', check: { any: [{ block: 'looks_sayforsecs' }, { block: 'looks_say' }] } },
        { text: 'Zet `volgend uiterlijk` binnen in een `herhaal`-lus.', check: { block: 'looks_nextcostume', inside: 'control_forever' } },
        { text: 'Zet er `wacht 0.2 seconden` achter, anders gaat het te snel.', check: { block: 'control_wait' } },
        'Probeer `verander kleur effect met 25` om de sprite een andere kleur te geven.'
      ],
      en: [
        { text: 'Add `say Hello! for 2 seconds` from Looks.', check: { any: [{ block: 'looks_sayforsecs' }, { block: 'looks_say' }] } },
        { text: 'Add `next costume` inside a `forever` loop.', check: { block: 'looks_nextcostume', inside: 'control_forever' } },
        { text: 'Put `wait 0.2 seconds` after it so the walk is not too fast.', check: { block: 'control_wait' } },
        'Try `change color effect by 25` to recolour the sprite.'
      ]
    }
  },
  {
    id: 'sc-04-keys',
    minutes: 15,
    concepts: ['events', 'keys', 'coordinates'],
    title: { nl: 'Bestuur met het toetsenbord', en: 'Control it with the keyboard' },
    blurb: {
      nl: 'Stuur je sprite met de pijltjestoetsen.',
      en: 'Steer your sprite with the arrow keys.'
    },
    steps: {
      nl: [
        { text: 'Voeg `wanneer pijltje rechts wordt ingedrukt` toe uit Gebeurtenissen.', check: { block: 'event_whenkeypressed' } },
        { text: 'Zet er `verander x met 10` onder.', check: { block: 'motion_changexby' } },
        'Doe hetzelfde voor het pijltje links met `verander x met -10`.',
        { text: 'Voeg nu omhoog en omlaag toe met `verander y met 10` en `-10`.', check: { block: 'motion_changeyby', min: 2 } }
      ],
      en: [
        { text: 'Add `when right arrow key pressed` from Events.', check: { block: 'event_whenkeypressed' } },
        { text: 'Under it, put `change x by 10`.', check: { block: 'motion_changexby' } },
        'Do the same for the left arrow with `change x by -10`.',
        { text: 'Now add up and down using `change y by 10` and `-10`.', check: { block: 'motion_changeyby', min: 2 } }
      ]
    }
  },
  {
    id: 'sc-05-backdrop',
    minutes: 15,
    concepts: ['backdrops', 'sprites'],
    title: { nl: 'Een decor en een tweede sprite', en: 'A stage and a second sprite' },
    blurb: {
      nl: 'Maak een tafereel met meer dan één figuur.',
      en: 'Build a scene with more than one character.'
    },
    steps: {
      nl: [
        'Klik rechtsonder op "Kies een achtergrond" en kies er een.',
        { text: 'Klik op "Kies een sprite" en voeg een tweede figuur toe.', check: { sprites: 2 } },
        'Geef de nieuwe sprite zijn eigen `wanneer groene vlag wordt aangeklikt`.',
        'Laat de twee sprites tegen elkaar praten met `wacht` ertussen.'
      ],
      en: [
        'Click "Choose a Backdrop" at the bottom right and pick one.',
        { text: 'Click "Choose a Sprite" and add a second character.', check: { sprites: 2 } },
        'Give the new sprite its own `when green flag clicked` script.',
        'Make the two sprites say something to each other using `wait`.'
      ]
    }
  },
  {
    id: 'sc-06-variables',
    minutes: 20,
    concepts: ['variables', 'sensing'],
    title: { nl: 'De score bijhouden', en: 'Keeping score' },
    blurb: {
      nl: 'Variabelen onthouden getallen voor jou.',
      en: 'Variables remember numbers for you.'
    },
    steps: {
      nl: [
        { text: 'Klik bij Variabelen op "Maak een variabele" en noem ze `score`.', check: { variableNamed: 'score' } },
        { text: 'Zet `maak score 0` onder je groene vlag-blok.', check: { block: 'data_setvariableto' } },
        'Gebruik `als ... dan` uit Besturen samen met `raak ik ...?` uit Waarnemen.',
        { text: 'Zet `verander score met 1` binnen in de als.', check: { block: 'data_changevariableby', inside: 'control_if' } }
      ],
      en: [
        { text: 'In Variables, click "Make a Variable" and call it `score`.', check: { variableNamed: 'score' } },
        { text: 'Add `set score to 0` under your green flag block.', check: { block: 'data_setvariableto' } },
        'Use `if touching ...` from Control and Sensing.',
        { text: 'Inside the if, add `change score by 1`.', check: { block: 'data_changevariableby', inside: 'control_if' } }
      ]
    }
  },
  {
    id: 'sc-07-chase',
    minutes: 30,
    concepts: ['game loop', 'random', 'collision'],
    title: { nl: 'Het achtervolgingsspel', en: 'The chase game' },
    blurb: {
      nl: 'Alles samen tot een spel dat je echt kan spelen.',
      en: 'Put it all together into a game you can play.'
    },
    steps: {
      nl: [
        'Bestuur je hoofdsprite met de pijltjestoetsen.',
        { text: 'Geef de tweede sprite een `herhaal`-lus met `ga naar willekeurige positie`.', check: { block: 'motion_goto' } },
        'Voeg `wacht 1 seconden` toe zodat hij niet te snel verspringt.',
        { text: 'Als de sprites elkaar raken: `verander score met 1` en speel een geluid.', check: { all: [{ block: 'sensing_touchingobject' }, { block: 'data_changevariableby' }] } },
        'Zet bij de groene vlag `maak score 0` zodat elk spel opnieuw begint.'
      ],
      en: [
        'Steer your main sprite with the arrow keys.',
        { text: 'Give the second sprite a `forever` loop with `go to random position`.', check: { block: 'motion_goto' } },
        'Add `wait 1 seconds` so it does not teleport too fast.',
        { text: 'When the sprites touch, `change score by 1` and play a sound.', check: { all: [{ block: 'sensing_touchingobject' }, { block: 'data_changevariableby' }] } },
        'Add a `when green flag clicked` block that resets the score to 0.'
      ]
    }
  },
  {
    id: 'sc-08-own',
    minutes: 40,
    concepts: ['design', 'creativity'],
    title: { nl: 'Maak er je eigen ding van', en: 'Make it yours' },
    blurb: {
      nl: 'Ontwerp je eigen project van nul.',
      en: 'Design your own project from scratch.'
    },
    steps: {
      nl: [
        'Bedenk wat je project doet — een spel, een verhaal of een animatie.',
        'Teken of kies de sprites die je nodig hebt.',
        'Bouw het hoofdscript en test na elke verandering.',
        'Voeg geluid en een titelscherm toe.',
        'Sla het op en download het, zodat je het thuis kan tonen.'
      ],
      en: [
        'Decide what your project does — a game, a story or an animation.',
        'Draw or choose the sprites you need.',
        'Build the main script, then test it after every change.',
        'Add sound and a title screen.',
        'Save it, then download it so you can show it at home.'
      ]
    }
  }
]
