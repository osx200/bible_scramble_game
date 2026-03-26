// All 66 books of the Bible
// difficulty: 1=easy, 2=medium, 3=hard
// testament: "OT" | "NT"
// wordCount: number of space-separated words in the name

const bibleBooks = [
  // --- OLD TESTAMENT ---
  // Easy (1)
  { id: 1,  name: 'Ruth',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 2,  name: 'Job',        testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 3,  name: 'Ezra',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 4,  name: 'Joel',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 5,  name: 'Amos',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 6,  name: 'Micah',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 7,  name: 'Jonah',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 8,  name: 'Hosea',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 9,  name: 'Esther',     testament: 'OT', difficulty: 1, wordCount: 1 },

  // Medium (2)
  { id: 10, name: 'Genesis',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 11, name: 'Exodus',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 12, name: 'Numbers',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 13, name: 'Joshua',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 14, name: 'Judges',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 15, name: 'Psalms',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 16, name: 'Proverbs',   testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 17, name: 'Isaiah',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 18, name: 'Ezekiel',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 19, name: 'Daniel',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 20, name: 'Nehemiah',   testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 21, name: 'Malachi',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 22, name: 'Haggai',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 23, name: 'Nahum',      testament: 'OT', difficulty: 2, wordCount: 1 },

  // Hard (3)
  { id: 24, name: 'Leviticus',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 25, name: 'Deuteronomy',    testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 26, name: 'Ecclesiastes',   testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 27, name: 'Lamentations',   testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 28, name: 'Obadiah',        testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 29, name: 'Habakkuk',       testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 30, name: 'Zephaniah',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 31, name: 'Zechariah',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 32, name: 'Chronicles',     testament: 'OT', difficulty: 3, wordCount: 1 },

  // Multi-word OT
  { id: 33, name: '1 Samuel',       testament: 'OT', difficulty: 2, wordCount: 2 },
  { id: 34, name: '2 Samuel',       testament: 'OT', difficulty: 2, wordCount: 2 },
  { id: 35, name: '1 Kings',        testament: 'OT', difficulty: 2, wordCount: 2 },
  { id: 36, name: '2 Kings',        testament: 'OT', difficulty: 2, wordCount: 2 },
  { id: 37, name: '1 Chronicles',   testament: 'OT', difficulty: 3, wordCount: 2 },
  { id: 38, name: '2 Chronicles',   testament: 'OT', difficulty: 3, wordCount: 2 },
  { id: 39, name: 'Song of Solomon',testament: 'OT', difficulty: 3, wordCount: 3 },

  // --- NEW TESTAMENT ---
  // Easy (1)
  { id: 40, name: 'Mark',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 41, name: 'Luke',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 42, name: 'John',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 43, name: 'Acts',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 44, name: 'Jude',       testament: 'NT', difficulty: 1, wordCount: 1 },

  // Medium (2)
  { id: 45, name: 'Matthew',    testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 46, name: 'Romans',     testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 47, name: 'Hebrews',    testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 48, name: 'James',      testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 49, name: 'Titus',      testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 50, name: 'Galatians',  testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 51, name: 'Ephesians',  testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 52, name: 'Timothy',    testament: 'NT', difficulty: 2, wordCount: 1 },

  // Hard (3)
  { id: 53, name: 'Corinthians',    testament: 'NT', difficulty: 3, wordCount: 1 },
  { id: 54, name: 'Philippians',    testament: 'NT', difficulty: 3, wordCount: 1 },
  { id: 55, name: 'Colossians',     testament: 'NT', difficulty: 3, wordCount: 1 },
  { id: 56, name: 'Thessalonians',  testament: 'NT', difficulty: 3, wordCount: 1 },
  { id: 57, name: 'Revelation',     testament: 'NT', difficulty: 3, wordCount: 1 },

  // Multi-word NT
  { id: 58, name: '1 Corinthians',  testament: 'NT', difficulty: 3, wordCount: 2 },
  { id: 59, name: '2 Corinthians',  testament: 'NT', difficulty: 3, wordCount: 2 },
  { id: 60, name: '1 Thessalonians',testament: 'NT', difficulty: 3, wordCount: 2 },
  { id: 61, name: '2 Thessalonians',testament: 'NT', difficulty: 3, wordCount: 2 },
  { id: 62, name: '1 Timothy',      testament: 'NT', difficulty: 2, wordCount: 2 },
  { id: 63, name: '2 Timothy',      testament: 'NT', difficulty: 2, wordCount: 2 },
  { id: 64, name: '1 Peter',        testament: 'NT', difficulty: 2, wordCount: 2 },
  { id: 65, name: '2 Peter',        testament: 'NT', difficulty: 2, wordCount: 2 },
  { id: 66, name: '1 John',         testament: 'NT', difficulty: 1, wordCount: 2 },
  { id: 67, name: '2 John',         testament: 'NT', difficulty: 1, wordCount: 2 },
  { id: 68, name: '3 John',         testament: 'NT', difficulty: 1, wordCount: 2 },
  { id: 69, name: 'Philemon',       testament: 'NT', difficulty: 2, wordCount: 1 },
]

export default bibleBooks
