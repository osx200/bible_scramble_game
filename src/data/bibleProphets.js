// Prophets of the Bible — the word list for the Prophets scramble sub-game.
// Same shape as bibleBooks.js so the whole scramble engine works unchanged.
// difficulty: 1=easy, 2=medium, 3=hard
// testament: "OT" | "NT"
// wordCount: number of space-separated words in the name

const bibleProphets = [
  // --- OLD TESTAMENT ---
  // Easy (1)
  { id: 1,  name: 'Amos',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 2,  name: 'Joel',       testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 3,  name: 'Jonah',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 4,  name: 'Micah',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 5,  name: 'Hosea',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 6,  name: 'Nahum',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 7,  name: 'Moses',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 8,  name: 'Aaron',      testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 9,  name: 'Samuel',     testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 10, name: 'Nathan',     testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 11, name: 'Elijah',     testament: 'OT', difficulty: 1, wordCount: 1 },
  { id: 12, name: 'Elisha',     testament: 'OT', difficulty: 1, wordCount: 1 },

  // Medium (2)
  { id: 13, name: 'Isaiah',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 14, name: 'Daniel',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 15, name: 'Haggai',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 16, name: 'Malachi',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 17, name: 'Obadiah',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 18, name: 'Ezekiel',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 19, name: 'Jeremiah',   testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 20, name: 'Zechariah',  testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 21, name: 'Miriam',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 22, name: 'Deborah',    testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 23, name: 'Huldah',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 24, name: 'Balaam',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 25, name: 'Ahijah',     testament: 'OT', difficulty: 2, wordCount: 1 },
  { id: 26, name: 'Micaiah',    testament: 'OT', difficulty: 2, wordCount: 1 },

  // Hard (3)
  { id: 27, name: 'Habakkuk',   testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 28, name: 'Zephaniah',  testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 29, name: 'Jeduthun',   testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 30, name: 'Shemaiah',   testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 31, name: 'Azariah',    testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 32, name: 'Hanani',     testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 33, name: 'Iddo',       testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 34, name: 'Oded',       testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 35, name: 'Eldad',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 36, name: 'Medad',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 37, name: 'Asaph',      testament: 'OT', difficulty: 3, wordCount: 1 },
  { id: 38, name: 'Heman',      testament: 'OT', difficulty: 3, wordCount: 1 },

  // --- NEW TESTAMENT ---
  // Easy (1)
  { id: 39, name: 'Anna',       testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 40, name: 'Silas',      testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 41, name: 'Agabus',     testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 42, name: 'Simeon',     testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 43, name: 'Lucius',     testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 44, name: 'Barnabas',   testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 45, name: 'Zacharias',  testament: 'NT', difficulty: 1, wordCount: 1 },
  { id: 46, name: 'John the Baptist', testament: 'NT', difficulty: 1, wordCount: 3 },

  // Medium (2)
  { id: 47, name: 'Manaen',     testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 48, name: 'Philip',     testament: 'NT', difficulty: 2, wordCount: 1 },
  { id: 49, name: 'Judas Barsabbas', testament: 'NT', difficulty: 2, wordCount: 2 },
]

export default bibleProphets
