const characters = [
  // Animes
  'naruto', 'sasuke', 'goku', 'vegeta', 'luffy', 'zoro', 'nami', 'sanji', 'chopper', 'robin',
  'ichigo', 'rukia', 'orihime', 'chad', 'urahara', 'aizen', 'byakuya', 'renji', 'toshiro',
  'eren', 'mikasa', 'armin', 'levi', 'erwin', 'hange', 'historia', 'ymir', 'jean', 'connie',
  'edward', 'alphonse', 'winry', 'mustang', 'hawkeye', 'armstrong', 'scar', 'greed', 'envy',
  'light', 'ryuk', 'l', 'near', 'mello', 'misa', 'rem', 'matsuda',
  'gon', 'killua', 'kurapika', 'leorio', 'hisoka', 'illumi', 'chrollo', 'meruem',
  'deku', 'bakugo', 'todoroki', 'ochako', 'iida', 'aizawa', 'allmight', 'endeavor',
  'spike', 'jet', 'faye', 'ed', 'ein', 'vicious', 'julia',
  'shinji', 'rei', 'asuka', 'misato', 'gendo', 'kaworu',
  'simon', 'kamina', 'yoko', 'nia', 'viral',
  'kirito', 'asuna', 'sinon', 'klein', 'agil',
  'natsu', 'erza', 'gray', 'lucy', 'wendy', 'jellal',
  'saitama', 'genos', 'tatsumaki', 'bang', 'garou',
  'rimuru', 'shion', 'benimaru', 'milim', 'diablo',
  'ainz', 'albedo', 'shalltear', 'demiurge', 'cocytus',

  // Filmes e Séries
  'frodo', 'gandalf', 'aragorn', 'legolas', 'gimli', 'boromir', 'saruman', 'sauron', 'gollum',
  'harry', 'hermione', 'ron', 'dumbledore', 'snape', 'voldemort', 'sirius', 'lupin', 'bellatrix',
  'luke', 'leia', 'han', 'vader', 'yoda', 'obi', 'chewie', 'palpatine', 'rey', 'finn',
  'batman', 'superman', 'wonder', 'flash', 'aquaman', 'cyborg', 'joker', 'lex',
  'ironman', 'thor', 'hulk', 'cap', 'natasha', 'hawkeye', 'vision', 'wanda', 'loki', 'thanos',
  'walter', 'jesse', 'skyler', 'hank', 'saul', 'mike', 'gus', 'jane',
  'tyrion', 'daenerys', 'jon', 'arya', 'sansa', 'cersei', 'jaime', 'ned', 'bran', 'hodor',
  'sherlock', 'watson', 'moriarty', 'irene', 'mycroft', 'lestrade',
  'mulder', 'scully', 'skinner', 'krycek', 'csm',
  'jack', 'kate', 'sawyer', 'locke', 'hurley', 'sayid', 'michael', 'ben', 'desmond',
  'eleven', 'mike', 'dustin', 'lucas', 'will', 'max', 'hop', 'joyce', 'billy',
  'geralt', 'yennefer', 'ciri', 'jaskier', 'triss', 'cahir', 'fringilla',
  'joel', 'ellie', 'tess', 'marlene', 'tommy', 'abby',
  'niko', 'trevor', 'michael', 'franklin', 'arthur', 'dutch', 'john',

  // Livros
  'atticus', 'scout', 'jem', 'boo', 'dill',
  'holden', 'phoebe', 'allie', 'stradlater',
  'gatsby', 'daisy', 'nick', 'jordan', 'tom',
  'winston', 'julia', 'obrien', 'parsons', 'syme',
  'dorian', 'henry', 'basil', 'sibyl', 'james',
  'raskolnikov', 'sonya', 'porfiry', 'dunya', 'razumikhin',
  'ahab', 'ishmael', 'queequeg', 'starbuck', 'pip',
  'heathcliff', 'cathy', 'hindley', 'edgar', 'linton',
  'jane', 'rochester', 'bertha', 'st_john', 'helen',
  'huck', 'tom', 'becky', 'injun', 'jim',
  'edmond', 'mercedes', 'fernand', 'danglars', 'villefort',
  'quixote', 'sancho', 'dulcinea', 'rocinante',
  'alice', 'cheshire', 'madhatter', 'queen', 'rabbit',
  'pip', 'estella', 'havisham', 'magwitch', 'jaggers',
  'dracula', 'mina', 'jonathan', 'renfield', 'abraham',
  'frankenstein', 'creature', 'clerval', 'walton', 'elizabeth',

  // Figuras Históricas
  'napoleon', 'cleopatra', 'caesar', 'alexander', 'hannibal',
  'einstein', 'newton', 'darwin', 'tesla', 'curie', 'hawking', 'turing', 'feynman',
  'socrates', 'plato', 'aristotle', 'epicurus', 'seneca', 'marcus', 'nietzsche', 'kant',
  'mozart', 'beethoven', 'bach', 'chopin', 'vivaldi', 'handel',
  'davinci', 'michelangelo', 'raphael', 'rembrandt', 'monet', 'picasso', 'dali', 'warhol',
  'shakespeare', 'dickens', 'twain', 'poe', 'tolstoy', 'dostoevsky', 'kafka', 'orwell',
  'washington', 'lincoln', 'roosevelt', 'churchill', 'mandela', 'gandhi', 'bolivar',
  'columbus', 'magellan', 'drake', 'vespucci', 'polo',
  'joan', 'spartacus', 'leonidas', 'saladin', 'sunzi',
]

const colors = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
  'gray', 'cyan', 'magenta', 'lime', 'indigo', 'violet', 'gold', 'silver', 'bronze', 'teal',
  'maroon', 'navy', 'olive', 'coral', 'salmon', 'crimson', 'scarlet', 'amber', 'ivory', 'khaki',
  'lavender', 'turquoise', 'emerald', 'sapphire', 'ruby', 'jade', 'cobalt', 'cerulean', 'ochre',
  'sienna', 'umber', 'charcoal', 'pearl', 'onyx', 'copper', 'platinum', 'rose', 'fuchsia', 'mint',
]

const professions = [
  'teacher', 'doctor', 'engineer', 'lawyer', 'pilot', 'nurse', 'chef', 'artist', 'writer',
  'soldier', 'detective', 'hacker', 'scientist', 'architect', 'designer', 'mechanic', 'farmer',
  'sailor', 'carpenter', 'plumber', 'electrician', 'programmer', 'analyst', 'trader', 'banker',
  'professor', 'researcher', 'journalist', 'photographer', 'musician', 'actor', 'director',
  'surgeon', 'dentist', 'pharmacist', 'therapist', 'psychologist', 'economist', 'philosopher',
  'astronaut', 'chemist', 'biologist', 'physicist', 'mathematician', 'statistician', 'linguist',
  'historian', 'geologist', 'botanist', 'zoologist', 'archaeologist', 'anthropologist',
]

const weekdays = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateCustomerCode() {
  return `${pick(characters)}_${pick(colors)}_${pick(professions)}_${pick(weekdays)}`
}
