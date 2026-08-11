#!/usr/bin/env node
/**
 * Regenerates supabase/seed_passages.sql with 100+ multi-sentence passages.
 * Usage: node scripts/generate-passages.mjs
 */
import { writeFileSync } from 'node:fs'

/** Hand-authored base passages (kept from earlier bank). */
const BASE = [
  'Morning light spilled across the quiet office as the team gathered for another day of focused work. Keyboards clicked in a steady rhythm while ideas moved from sticky notes into working software. By noon the hallway smelled of fresh coffee and the whiteboard was covered with arrows and questions. Everyone knew that small improvements stacked together would shape the product they were proud to ship.',
  'Typing practice rewards patience more than force and rewards attention more than speed alone. When fingers settle into a natural path the mind can stay on meaning instead of hunting for keys. Accuracy protects every later burst of pace because corrections cost more than careful first strokes. Over weeks the same drills become almost musical and progress shows up without drama.',
  'The Kathmandu evening cooled quickly after the monsoon clouds drifted east. Street lamps reflected in shallow puddles while scooters threaded between shops still open late. Friends met under a canopy to compare scores from the daily typing board and laugh about near misses. Competition stayed friendly because the real prize was shared improvement across the whole company.',
  'A long sentence bank keeps practice honest by refusing to let muscle memory memorize one paragraph. Varied vocabulary stretches the hands into uncommon letter pairs and punctuation habits. Three or four connected sentences create a flow that feels closer to real writing than isolated words. That realism is what transfers into email chats documents and code comments later.',
  'Designers and engineers often argue about polish versus shipping yet both need clear communication. A typing arena built for the company is a small cultural tool as much as a game. It surfaces who is present in the moment and invites people to return tomorrow for another attempt. Leaderboards matter less than the habit of showing up and caring about craft.',
  'Rain tapped the windows while the office heaters hummed against the damp air. Someone restarted a failed run with a quick shortcut and the room barely noticed. Soft laughter rose when a top score flipped for the thirty second mode late in the afternoon. The sound of focused work returned almost immediately because the next challenge was already waiting.',
  'Shortcuts should feel invisible once they become muscle memory the way they do on Monkeytype. Tab followed by Enter confirms a restart so accidents do not wipe a good run. Escape can pull focus or signal cancel depending on context and players learn the pattern quickly. Consistency between keyboard and on screen hints builds trust in the interface.',
  'Finish the passage early and the timer should stop because the work is done. Scoring then uses the time you actually spent not the unused seconds on the clock. That rule rewards clean completion without forcing people to keep typing filler after the text ends. It also mirrors how quote modes feel on familiar public typing sites.',
  'Live statistics during a run help players adjust without breaking concentration. A calm caret marks the next character while completed letters show correct or incorrect states. Upcoming text stays dim enough to guide the eye without shouting for attention. The whole composition should feel like one quiet instrument panel around the words.',
  'Company jargon can sneak into custom sentences when admins expand the bank later. Until then general English passages with full stops and commas train everyday fluency. Long lines wrap carefully so mobile screens remain readable without losing the centered stage. Branding sits lightly around the arena rather than competing with the text.',
  'After a completed attempt the results should appear with the same restraint as the run itself. Large WPM and accuracy numbers are enough without packing the first viewport with extra cards. A short line explains whether the daily best moved and invites another try. Restarting should be one familiar gesture away so momentum never dies.',
  'Some afternoons the board stays empty until the first finisher of the day appears. That emptiness is intentional because it celebrates participation instead of padding ranks. When Realtime updates land they should only fire for improved daily bests. Noise free updates keep the scoreboard feeling like a live race instead of a flickering log.',
  'Backspace is part of honest practice and should reverse the last keystroke cleanly. Players who panic delete whole words will see accuracy drop and learn to slow down. The engine must ignore modifier combinations that belong to the browser or the operating system. Only intentional printable input advances the caret through the passage.',
  'Duration tabs for fifteen thirty and sixty seconds remain the competitive frames. Choosing a duration mid run should be blocked so a result stays comparable. Shared tabs between the arena and the scoreboard keep the shell coherent. Switching duration after a finish simply loads a new passage for the next attempt.',
  'Admins maintain the sentence bank so content can grow without a deploy. Inactive rows stay out of rotation while active rows feed random picks. Seeding a thousand words of multi sentence passages gives depth on day one. Future edits can replace weak lines without touching player history.',
  'Focus management is easy to get wrong and painful when it fails. Clicking the text area should restore keyboard capture without a visible form field. A gentle underline or blinking caret communicates readiness better than a loud border. When focus is lost a subtle prompt can ask the player to click and continue.',
  'Typography carries the personality of a typing product more than any illustration. A monospace face for the passage keeps character widths honest for the caret. Supporting labels can use a quieter sans so hierarchy stays clear. Color should separate correct incorrect and upcoming states without neon excess.',
  'Night themes dominate many typing tools and Monkey Type follows that familiar stage. Deep charcoal backgrounds reduce glare during long practice sessions after work. Accent color belongs to the caret and the active duration control. Everything else stays secondary so the sentence remains the hero of the screen.',
  'Employees join by allowlisted email because the roster is company managed. Avatars and usernames travel with every scoreboard row so faces stay human. Admin tools remain behind a flag so everyday players are not distracted. The login screen stays minimal because the product is the practice not the account ceremony.',
  'Tomorrow the same people will return and chase a cleaner accuracy line. Some will chase raw speed and learn the cost of reckless errors. Others will treat the arena like a warm up before deep work. Either way the shared board turns private practice into a quiet team ritual.',
]

/** Extra sentence pools — combined into unique 3–4 sentence passages. */
const OPENERS = [
  'The office settled into a familiar hush after lunch as monitors glowed with half finished tasks.',
  'A cool breeze moved through the open window and carried the smell of rain into the room.',
  'Friday afternoons often feel slower yet the typing board somehow stays lively until dusk.',
  'Someone brought fresh momos upstairs and the kitchen conversation spilled into the hallway.',
  'The stand up ended early so people returned to desks with clearer priorities than usual.',
  'Soft music played from a distant speaker while a few teammates practiced quiet runs.',
  'Clouds gathered over the valley and the light in the room shifted toward a softer gray.',
  'A new hire asked how the daily board worked and received a quick friendly demonstration.',
  'The deploy finished cleanly and the team celebrated with a short break before the next ticket.',
  'Late night review notes waited in a shared doc while people finished one more timed attempt.',
  'Sunlight cut across the desks in narrow bands and made the keycaps look almost golden.',
  'The printer jammed again yet nobody seemed surprised by the familiar mechanical complaint.',
  'A sticky note on the monitor simply said ship then refine which felt like good advice.',
  'Tea cooled beside a notebook filled with sketches of flows that still needed sharper edges.',
  'The scoreboard refreshed and a quiet cheer rose when a familiar name climbed a few seats.',
  'Outside traffic hummed like a distant metronome while fingers found a steadier rhythm inside.',
  'A pair of headphones rested on a chair as their owner stepped away to refill a water bottle.',
  'The wall calendar marked another sprint boundary and the room felt ready for a clean start.',
  'Someone muttered about a tricky regex then laughed and asked for a short typing reset instead.',
  'The first run of the morning always feels rusty until the third sentence unlocks old speed.',
  'Rain returned in thin sheets and the city lights blurred into long streaks on the glass.',
  'A design critique ended with agreement that less chrome would help the words breathe more.',
  'The admin panel stayed quiet today because the sentence bank already had enough active rows.',
  'A coworker stretched their wrists and reset posture before opening the fifteen second mode.',
  'The hallway whiteboard held a messy map of dependencies that somehow still made sense.',
  'Someone left a pastry box open and the sugar smell competed with the usual coffee scent.',
  'A pull request waited for review while its author practiced accuracy instead of refreshing.',
  'The router blinked calmly in the corner as if nothing dramatic ever happened on the network.',
  'A soft notification pinged then vanished because focus mode had already muted most alerts.',
  'The team chat went quiet for ten minutes which usually means deep work has finally begun.',
]

const MIDDLES = [
  'Fingers found the home row without looking and the caret advanced through familiar shapes.',
  'Accuracy dipped for a moment then recovered once the rush to beat the clock settled down.',
  'A misplaced comma forced a quick backspace and a reminder that calm beats reckless speed.',
  'The passage stretched across four short sentences so the run felt closer to real writing.',
  'Live WPM flickered upward as correct characters stacked without long pauses between words.',
  'Someone nearby finished early and the soft click of Tab then Enter started a fresh attempt.',
  'Punctuation arrived in clusters that tested little finger reach more than raw hand speed.',
  'A difficult word slowed the line briefly before rhythm returned on the next familiar phrase.',
  'The timer kept counting while attention stayed on letter shapes rather than the clock face.',
  'Spacebar timing mattered as much as letter hits because uneven gaps broke the flow of words.',
  'Capital letters appeared sparingly yet still demanded a clean shift that did not stall pace.',
  'A long compound sentence asked for patience and rewarded players who refused to panic.',
  'Incorrect keys flashed briefly then faded as the next correct stroke pulled focus forward.',
  'The next clause introduced uncommon letter pairs that kept muscle memory from coasting.',
  'Breathing stayed even and shoulders dropped which often helps more than any clever tip.',
  'A glance at accuracy confirmed the tradeoff was worth it even if peak speed looked lower.',
  'The caret blinked patiently on a space and invited the next word without visual noise.',
  'Numbers never appeared in this bank so practice stayed on plain language and punctuation.',
  'A short pause after an error prevented a cascade of mistakes that would ruin the attempt.',
  'The closing sentence arrived sooner than expected which is the quiet joy of finishing early.',
  'Hands stayed relaxed over the keys while eyes read a few words ahead of the active caret.',
  'A teammate whispered a joke then went silent again out of respect for the shared focus.',
  'The sixty second mode felt spacious compared with the sharper pressure of fifteen seconds.',
  'Repeated practice on similar themes still helped because wording and rhythm kept changing.',
  'The mind wandered toward weekend plans then returned when a tricky spelling demanded care.',
  'Each completed word unlocked a little confidence that made the following line feel lighter.',
  'The interface stayed out of the way so the only drama left was between fingers and text.',
  'A soft underline marked a miss and the correction taught more than any lecture could.',
  'Progress felt honest because every character counted and leftover timer seconds did not.',
  'The run became almost meditative once the first awkward stretch of letters had passed.',
]

const CLOSERS = [
  'When the result appeared the numbers felt earned rather than gifted by unused time.',
  'A quick restart followed because momentum is easier to keep than to rebuild from scratch.',
  'The board updated only if the daily best moved which kept the celebration meaningful.',
  'Someone smiled at a modest gain and saved the bigger chase for tomorrow morning.',
  'Outside the rain softened and the room lights seemed warmer against the darkening sky.',
  'The next passage loaded with new wording so memory could not coast on yesterday\'s lines.',
  'A short stretch break reset the wrists before another attempt at cleaner accuracy.',
  'Team chat stayed quiet except for a single reaction emoji under the latest high score.',
  'The lesson was simple again: slow enough to be correct then let speed grow naturally.',
  'By the end of the hour several people looked looser at the keyboard than when they began.',
  'A saved attempt joined the history and the day felt slightly more complete than before.',
  'The caret finally rested and the screen returned to calm waiting for the next first key.',
  'Nobody needed a trophy speech because shared practice already carried its own reward.',
  'Tomorrow the same arena will wait with fresh text and the same honest rules of play.',
  'A final sip of tea cooled while the scoreboard held still under the Kathmandu date line.',
  'The product stayed small on purpose so the habit could grow without ceremony or clutter.',
  'Even a mediocre run taught something useful about posture pacing and attention.',
  'The office returned to tickets and meetings yet the typing ritual lingered in the fingers.',
  'Another name appeared on the board and the friendly rivalry quietly raised the floor.',
  'That was enough for tonight and the laptop lid closed on a calm unfinished cup of coffee.',
]

const EXTRA_FOURTH = [
  'The whole loop stayed playful even when scores mattered enough to try once more.',
  'Small rituals like this keep a remote friendly team feeling present in the same room.',
  'Nothing fancy was required beyond clear text a fair timer and a shared place to compare.',
  'Practice compounds the same way shipping compounds when people return day after day.',
  'Monkey Type remains a toy with a serious streak because craft always starts with habits.',
  'The next person to sit down will find a living board instead of an empty practice void.',
  'Good tools disappear and leave only the feeling of words moving cleanly under the hands.',
  'A fun project can still respect details when the details make the practice feel fair.',
]

function sentenceCount(passage) {
  return passage.split(/(?<=[.!?])\s+/).filter(Boolean).length
}

function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function buildCombinations(target = 110) {
  const out = [...BASE]
  const seen = new Set(out)

  let oi = 0
  let mi = 0
  let ci = 0
  let ei = 0

  while (out.length < target) {
    const a = OPENERS[oi % OPENERS.length]
    const b = MIDDLES[mi % MIDDLES.length]
    const c = CLOSERS[ci % CLOSERS.length]
    const useFourth = out.length % 3 !== 0
    const parts = useFourth
      ? [a, b, MIDDLES[(mi + 7) % MIDDLES.length], c]
      : [a, b, c]
    // Occasionally append a short fourth closer for variety on 3-sentence builds.
    if (!useFourth && out.length % 5 === 0) {
      parts.push(EXTRA_FOURTH[ei % EXTRA_FOURTH.length])
      ei++
    }

    const passage = parts.join(' ')
    oi++
    mi += 3
    ci += 2

    if (seen.has(passage)) {
      // Nudge indices to escape a rare collision.
      mi++
      continue
    }
    if (sentenceCount(passage) < 3) continue

    seen.add(passage)
    out.push(passage)
  }

  return out
}

const PASSAGES = buildCombinations(110)

// Validate
for (const [i, p] of PASSAGES.entries()) {
  const n = sentenceCount(p)
  if (n < 3) {
    throw new Error(`Passage ${i} has only ${n} sentences`)
  }
}

const total = PASSAGES.reduce((n, p) => n + wordCount(p), 0)
const lines = [
  `-- Bulk passages (${PASSAGES.length} passages, ~${total} words). Safe to re-run (skips duplicate text).`,
  '-- Run in Supabase SQL Editor after schema exists, or: node scripts/seed-passages-to-supabase.mjs',
  '',
  'insert into public.sentences (text, is_active)',
  'select v.body, true',
  'from (',
  '  values',
]
PASSAGES.forEach((p, i) => {
  const comma = i < PASSAGES.length - 1 ? ',' : ''
  lines.push('    ($$' + p.replace(/\$/g, '') + '$$)' + comma)
})
lines.push(') as v(body)')
lines.push('where not exists (')
lines.push('  select 1 from public.sentences existing where existing.text = v.body')
lines.push(');')
lines.push('')

writeFileSync('supabase/seed_passages.sql', lines.join('\n'))
console.log(
  'Wrote supabase/seed_passages.sql —',
  PASSAGES.length,
  'passages,',
  total,
  'words',
)

export { PASSAGES }
