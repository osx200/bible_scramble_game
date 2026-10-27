/**
 * Screen artwork: Gustave Doré's engravings for the 1866 English Bible
 * (public domain; files from Wikimedia Commons, "Doré's English Bible").
 * Stored greyscale in public/art/ and tinted lapis by components/Stage, so
 * the same files work in light and dark mode. Regenerate from the Commons
 * originals at about 1150px tall, WebP — each screen loads exactly one.
 *
 * `focus` is the CSS object-position that keeps the subject in frame when
 * the panel crops the plate (tall on desktop, a short band on phones).
 */
const ART = {
  creation: { file: 'creation', title: 'The Creation of Light', ref: 'Genesis 1:3', focus: '50% 30%' },
  sinai: { file: 'sinai', title: 'Moses Comes Down from Mount Sinai', ref: 'Exodus 34:29', focus: '50% 35%' },
  canaan: { file: 'canaan', title: 'Abraham Goes to the Land of Canaan', ref: 'Genesis 12:5', focus: '85% 55%' },
  law: { file: 'law', title: 'The Giving of the Law on Mount Sinai', ref: 'Exodus 19:20', focus: '50% 40%' },
  elijah: { file: 'elijah', title: 'Elijah Ascends to Heaven in a Chariot of Fire', ref: '2 Kings 2:11', focus: '50% 30%' },
  ruth: { file: 'ruth', title: 'Ruth and Boaz', ref: 'Ruth 2:8', focus: '45% 50%' },
  jacob: { file: 'jacob', title: 'Jacob’s Dream', ref: 'Genesis 28:12', focus: '50% 40%' },
  joshua: { file: 'joshua', title: 'Joshua Commands the Sun to Stand Still', ref: 'Joshua 10:12', focus: '50% 40%' },
  jonathan: { file: 'jonathan', title: 'David and Jonathan', ref: '1 Samuel 20:41', focus: '50% 62%' },
  abraham: { file: 'abraham', title: 'Abraham and the Three Angels', ref: 'Genesis 18:2', focus: '50% 50%' },
  ezra: { file: 'ezra', title: 'Ezra Reads the Law to the People', ref: 'Nehemiah 8:5', focus: '50% 40%' },
  isaiah: { file: 'isaiah', title: 'The Prophet Isaiah', ref: 'Isaiah 6:8', focus: '50% 35%' },
  dove: { file: 'dove', title: 'A Dove Is Sent Forth from the Ark', ref: 'Genesis 8:11', focus: '50% 40%' },
}

export const getArt = (key) => {
  const a = ART[key]
  return a && { ...a, src: `/art/${a.file}.webp` }
}

/** Every plate, for the credits on the About screen */
export const ART_LIST = Object.values(ART)

/** Each Word Unscramble set gets its own scene */
export const WORD_SET_ART = {
  books: 'law',
  prophets: 'elijah',
  couples: 'ruth',
  grandmix: 'jacob',
}
