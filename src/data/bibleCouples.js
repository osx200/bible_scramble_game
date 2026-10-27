// Biblical Couples — the word list for the Couples scramble sub-game.
// Each round shows one spouse and the player unscrambles the other
// ("MOSES & ______"); which side is shown is picked at random per round by
// selectWords() (utils/wordFilter.js), which turns a pair into an ordinary
// engine entry whose `name` is the answer.
//
// spouses: written husband first, as Scripture usually names them
// difficulty: 1=easy, 2=medium, 3=hard — keep each level at 10+ pairs
// testament: only feeds the testament hint; this set has no category filter
//
// Someone with several spouses (David, Jacob, Abraham, Bathsheba, Ruth,
// Abigail) appears in several pairs. That's fine: the scrambled tiles show
// exactly which name is wanted.

const bibleCouples = [
  // Easy (1)
  { id: 1,  spouses: ['Adam', 'Eve'],              testament: 'OT', difficulty: 1 }, // Gen 3:20
  { id: 2,  spouses: ['Abraham', 'Sarah'],         testament: 'OT', difficulty: 1 }, // Gen 17:15
  { id: 3,  spouses: ['Isaac', 'Rebekah'],         testament: 'OT', difficulty: 1 }, // Gen 24:67
  { id: 4,  spouses: ['Jacob', 'Rachel'],          testament: 'OT', difficulty: 1 }, // Gen 29:28
  { id: 5,  spouses: ['Boaz', 'Ruth'],             testament: 'OT', difficulty: 1 }, // Ruth 4:13
  { id: 6,  spouses: ['Moses', 'Zipporah'],        testament: 'OT', difficulty: 1 }, // Ex 2:21
  { id: 7,  spouses: ['Elkanah', 'Hannah'],        testament: 'OT', difficulty: 1 }, // 1 Sam 1:2
  { id: 8,  spouses: ['David', 'Bathsheba'],       testament: 'OT', difficulty: 1 }, // 2 Sam 11:27
  { id: 9,  spouses: ['Ahab', 'Jezebel'],          testament: 'OT', difficulty: 1 }, // 1 Kgs 16:31
  { id: 10, spouses: ['Joseph', 'Mary'],           testament: 'NT', difficulty: 1 }, // Matt 1:24
  { id: 11, spouses: ['Zechariah', 'Elizabeth'],   testament: 'NT', difficulty: 1 }, // Luke 1:5
  { id: 12, spouses: ['Aquila', 'Priscilla'],      testament: 'NT', difficulty: 1 }, // Acts 18:2

  // Medium (2)
  { id: 13, spouses: ['Jacob', 'Leah'],            testament: 'OT', difficulty: 2 }, // Gen 29:23
  { id: 14, spouses: ['David', 'Michal'],          testament: 'OT', difficulty: 2 }, // 1 Sam 18:27
  { id: 15, spouses: ['David', 'Abigail'],         testament: 'OT', difficulty: 2 }, // 1 Sam 25:42
  { id: 16, spouses: ['Hosea', 'Gomer'],           testament: 'OT', difficulty: 2 }, // Hos 1:3
  { id: 17, spouses: ['Ananias', 'Sapphira'],      testament: 'NT', difficulty: 2 }, // Acts 5:1
  { id: 18, spouses: ['Xerxes', 'Esther'],         testament: 'OT', difficulty: 2 }, // Esth 2:17 (Ahasuerus)
  { id: 19, spouses: ['Joseph', 'Asenath'],        testament: 'OT', difficulty: 2 }, // Gen 41:45
  { id: 20, spouses: ['Amram', 'Jochebed'],        testament: 'OT', difficulty: 2 }, // Ex 6:20
  { id: 21, spouses: ['Elimelech', 'Naomi'],       testament: 'OT', difficulty: 2 }, // Ruth 1:2
  { id: 22, spouses: ['Nabal', 'Abigail'],         testament: 'OT', difficulty: 2 }, // 1 Sam 25:3
  { id: 23, spouses: ['Salmon', 'Rahab'],          testament: 'OT', difficulty: 2 }, // Matt 1:5
  { id: 24, spouses: ['Herod', 'Herodias'],        testament: 'NT', difficulty: 2 }, // Mark 6:17

  // Hard (3)
  { id: 25, spouses: ['Aaron', 'Elisheba'],        testament: 'OT', difficulty: 3 }, // Ex 6:23
  { id: 26, spouses: ['Heber', 'Jael'],            testament: 'OT', difficulty: 3 }, // Judg 4:17
  { id: 27, spouses: ['Lappidoth', 'Deborah'],     testament: 'OT', difficulty: 3 }, // Judg 4:4
  { id: 28, spouses: ['Abraham', 'Keturah'],       testament: 'OT', difficulty: 3 }, // Gen 25:1
  { id: 29, spouses: ['Mahlon', 'Ruth'],           testament: 'OT', difficulty: 3 }, // Ruth 4:10
  { id: 30, spouses: ['Jehoiada', 'Jehosheba'],    testament: 'OT', difficulty: 3 }, // 2 Chr 22:11
  { id: 31, spouses: ['Felix', 'Drusilla'],        testament: 'NT', difficulty: 3 }, // Acts 24:24
  { id: 32, spouses: ['Xerxes', 'Vashti'],         testament: 'OT', difficulty: 3 }, // Esth 1:9 (Ahasuerus)
  { id: 33, spouses: ['Uriah', 'Bathsheba'],       testament: 'OT', difficulty: 3 }, // 2 Sam 11:3
  { id: 34, spouses: ['Lamech', 'Adah'],           testament: 'OT', difficulty: 3 }, // Gen 4:19
  { id: 35, spouses: ['Esau', 'Judith'],           testament: 'OT', difficulty: 3 }, // Gen 26:34
  { id: 36, spouses: ['Er', 'Tamar'],              testament: 'OT', difficulty: 3 }, // Gen 38:6
]

export default bibleCouples
