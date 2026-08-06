/**
 * The Scratch track.
 *
 * Scratch cannot be checked automatically from outside the editor, so each step
 * is something the child ticks off themselves. Block names are written the way
 * they appear in the editor palette.
 */

export const scratchLessons = [
  {
    id: 'sc-01-move',
    title: 'Make the cat move',
    blurb: 'Your first blocks: click the flag and something happens.',
    minutes: 10,
    concepts: ['events', 'motion'],
    steps: [
      'Drag a `when green flag clicked` block from Events onto the empty area.',
      'Snap `move 10 steps` from Motion underneath it.',
      'Click the green flag. The cat moves a little!',
      'Change 10 into 100 and click the flag again.'
    ]
  },
  {
    id: 'sc-02-loop',
    title: 'Loops and glide',
    blurb: 'Repeat blocks so the cat keeps going.',
    minutes: 12,
    concepts: ['control', 'repeat', 'forever'],
    steps: [
      'Add a `repeat 10` block from Control around your move block.',
      'Put `move 10 steps` inside the repeat.',
      'Add `if on edge, bounce` from Motion.',
      'Swap `repeat 10` for `forever` and watch the cat bounce for ever.'
    ]
  },
  {
    id: 'sc-03-looks',
    title: 'Talking and costumes',
    blurb: 'Make your sprite speak and change how it looks.',
    minutes: 12,
    concepts: ['looks', 'costumes', 'wait'],
    steps: [
      'Add `say Hello! for 2 seconds` from Looks.',
      'Add `next costume` inside a `forever` loop.',
      'Put `wait 0.2 seconds` after it so the walk is not too fast.',
      'Try `change color effect by 25` to recolour the sprite.'
    ]
  },
  {
    id: 'sc-04-keys',
    title: 'Control it with the keyboard',
    blurb: 'Steer your sprite with the arrow keys.',
    minutes: 15,
    concepts: ['events', 'keys', 'coordinates'],
    steps: [
      'Add `when right arrow key pressed` from Events.',
      'Under it, put `change x by 10`.',
      'Do the same for the left arrow with `change x by -10`.',
      'Now add up and down using `change y by 10` and `-10`.'
    ]
  },
  {
    id: 'sc-05-backdrop',
    title: 'A stage and a second sprite',
    blurb: 'Build a scene with more than one character.',
    minutes: 15,
    concepts: ['backdrops', 'sprites'],
    steps: [
      'Click "Choose a Backdrop" at the bottom right and pick one.',
      'Click "Choose a Sprite" and add a second character.',
      'Give the new sprite its own `when green flag clicked` script.',
      'Make the two sprites say something to each other using `wait`.'
    ]
  },
  {
    id: 'sc-06-variables',
    title: 'Keeping score',
    blurb: 'Variables remember numbers for you.',
    minutes: 20,
    concepts: ['variables', 'sensing'],
    steps: [
      'In Variables, click "Make a Variable" and call it `score`.',
      'Add `set score to 0` under your green flag block.',
      'Use `if touching ...` from Control and Sensing.',
      'Inside the if, add `change score by 1`.'
    ]
  },
  {
    id: 'sc-07-chase',
    title: 'The chase game',
    blurb: 'Put it all together into a game you can play.',
    minutes: 30,
    concepts: ['game loop', 'random', 'collision'],
    steps: [
      'Steer your main sprite with the arrow keys.',
      'Give the second sprite a `forever` loop with `go to random position`.',
      'Add `wait 1 seconds` so it does not teleport too fast.',
      'When the sprites touch, `change score by 1` and play a sound.',
      'Add a `when green flag clicked` block that resets the score to 0.'
    ]
  },
  {
    id: 'sc-08-own',
    title: 'Make it yours',
    blurb: 'Design your own project from scratch.',
    minutes: 40,
    concepts: ['design', 'creativity'],
    steps: [
      'Decide what your project does — a game, a story or an animation.',
      'Draw or choose the sprites you need.',
      'Build the main script, then test it after every change.',
      'Add sound and a title screen.',
      'Save it, then download it so you can show it at home.'
    ]
  }
]
