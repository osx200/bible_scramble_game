// The Twelve, plus Matthias (chosen to replace Judas, Acts 1:26) and Paul.
// Merged with bibleProphets.js into the "Prophets & Disciples" word set —
// see wordSets.js. Philip is already on the prophets list, so this file
// doesn't repeat him; wordSets.js de-dupes by name regardless.
// Same shape as bibleBooks.js. difficulty: 1=easy, 2=medium, 3=hard

const bibleDisciples = [
  // Easy (1)
  { id: 1,  name: 'Peter',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 2,  name: 'Andrew',      testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 3,  name: 'James',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 4,  name: 'John',        testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 5,  name: 'Thomas',      testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 6,  name: 'Matthew',     testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 7,  name: 'Paul',        testament: 'NT', difficulty: 1, wordCount: 1 },

  // Medium (2)
  { id: 8,  name: 'Bartholomew',    testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 9,  name: 'Thaddaeus',      testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 10, name: 'Matthias',       testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 11, name: 'Judas Iscariot', testament: 'NT', difficulty: 2, wordCount: 2 },

  // Hard (3)
  { id: 12, name: 'Simon the Zealot',      testament: 'NT', difficulty: 3, wordCount: 3 },
  { id: 13, name: 'James son of Alphaeus', testament: 'NT', difficulty: 3, wordCount: 4 },
]

export default bibleDisciples
