const SUBSTITUTIONS = {
  // --- TECH & PROGRAMACIÓN ---
  frontend: 'fron tend',
  backend: 'bak end',
  fullstack: 'ful estak',
  stack: 'estak',
  cloud: 'claud',
  deploy: 'diplói',
  framework: 'fréim uork',
  software: 'sóft uer',
  hardware: 'járduer',
  bug: 'bag',
  debug: 'dibag',
  feature: 'fíchur',
  release: 'rilís',
  script: 'escript',
  middleware: 'mídel uer',
  database: 'deitabeis',
  query: 'kuéri',
  token: 'tóken',
  branch: 'branch',

  // --- MARKETING & REDES SOCIALES ---
  engagement: 'enguéich ment',
  branding: 'brándin',
  marketing: 'márketin',
  insights: 'ínsaits',
  insight: 'ínsait',
  leads: 'lids',
  lead: 'lid',
  target: 'tárguet',
  naming: 'néimin',
  copywriting: 'copi raitin',
  storytelling: 'estóri telin',
  influencer: 'influyénser',
  streaming: 'estrímin',
  podcast: 'pódcast',
  feed: 'fid',
  hashtag: 'jástag',
  engagement: 'enguéichment',
  community: 'comiúniti',
  manager: 'mánaier',
  filmmaker: 'filmeiker',
  filmmaking: 'filmeiking',
  film: 'film',
  filming: 'filmin',

  // --- BUSINESS & RECURSOS HUMANOS ---
  startup: 'stártap',
  founder: 'fáunder',
  pitch: 'pich',
  ceo: 'si-i-ó',
  cto: 'si-ti-ó',
  hr: 'ache erre',
  'soft skills': 'soft es kils',
  'hard skills': 'jard es kils',
  feedback: 'fídbak',
  sprint: 'esprint',
  scrum: 'escrum',
  meeting: 'mítin',
  workshop: 'uórk shop',
  roadmap: 'ród map',
  networking: 'nét uorkin',
  freelance: 'frílans',
  performance: 'perfórmans',
  coaching: 'cóuchin',

  // --- FINANZAS & CRYPTO ---
  trading: 'tréidin',
  holding: 'jóldin',
  blockchain: 'blók chein',
  wallet: 'uólet',
  tokenomics: 'tokenómics',
  cash: 'cash',
  broker: 'bróker',
  bullish: 'búlish',
  bearish: 'béarish',
  portfolio: 'portfolio',

  // --- CULTURA POP & GAMER ---
  gamer: 'guéimer',
  gaming: 'guéimin',
  flow: 'flou',
  boss: 'bos',
  'power-up': 'páuer ap',
  'level up': 'lébel ap',
  hype: 'jaip',
  crush: 'crash',
  vibe: 'vaib',
  mood: 'mud',
  gameplay: 'guéim plei',
  setup: 'sétap',
  skin: 'esquin',
  esports: 'es ports',
  esport: 'es port',
  minecraft: 'máin kráft',
  fortnite: 'fort náit',
  'league of legends': 'líg of léyends',
  'call of duty': 'kól of dúti',
  'free fire': 'fri fair',
  roblox: 'robloks',
  pubg: 'pabg',
  'pubg mobile': 'pabg móbail',
  'pubg mobile': 'pabg móbail',

  // --- DEPORTES & FITNESS ---
  running: 'ranin',
  runner: 'raner',
  spinning: 'espinin',
  hiking: 'jaikin',
  crossfit: 'crosfit',
  workout: 'uorcaut',
  fitness: 'fitnes',
  gym: 'yim',
  coach: 'couch',
  training: 'treinin',
  paddle: 'padel',
  surfing: 'serfin',
  skating: 'eskeitin',
  snowboard: 'esnou bord',
  yoga: 'yoga', // Se queda igual, pero por si acaso
  stretching: 'estrechin',
  'full contact': 'ful contak',
  trekking: 'trekin',

  // --- HOBBIES & ESTILO DE VIDA ---
  gaming: 'gueimin',
  streaming: 'estrimin',
  cosplay: 'cosplei',
  cooking: 'cuquin',
  baking: 'beikin',
  shopping: 'shopin',
  traveling: 'trabelin',
  camping: 'campin',
  gardening: 'gardenin',
  reading: 'ridin',
  painting: 'peintin',
  diy: 'di-ai-uai',
  crafting: 'craftin',
  'pet friendly': 'pet frendli',
  outdoors: 'aut dors',

  // --- VIDA COTIDIANA & TENDENCIAS ---
  lifestyle: 'laif stail',
  weekend: 'uik end',
  brunch: 'branch',
  delivery: 'deliberi',
  takeaway: 'teik a uei',
  outfit: 'autfit',
  look: 'luk',
  chill: 'chil',
  relax: 'rilaks',
  party: 'parti',
  hobby: 'jobi',
  hobbies: 'jobis',
  cool: 'cul',
  top: 'top',
  vintage: 'vintash',
  minimalist: 'minimalist',
  smart: 'esmart',
  'home office': 'jom ofis',
  coworking: 'cou uorkin',

  // --- MARCA & PROYECTO ---
  spotz: 'spots',
  labs: 'labs',
  ainfold: 'éin fold',
  "ai'nfold": 'éin fold',
};

const SORTED_WORDS = Object.keys(SUBSTITUTIONS).sort((a, b) => b.length - a.length);

export const normalizeTTS = async (text) => {
  if (!text || typeof text !== 'string') return '';

  let normalized = text;

  SORTED_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}(s?)\\b`, 'gi');

    normalized = normalized.replace(regex, (match, plural) => {
      const replacement = SUBSTITUTIONS[word.toLowerCase()];
      return plural ? replacement + 's' : replacement;
    });
  });

  return normalized;
};
