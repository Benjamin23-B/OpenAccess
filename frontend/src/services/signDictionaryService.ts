/**
 * Sign Language Dictionary Service
 * Integrates Kozha datasets (ISL, ASL, BSL, DGS, LSF) with HamNoSys and SiGML generation.
 */

export interface SignDictionaryEntry {
  id: string;
  gloss: string;
  language: 'ISL' | 'ASL' | 'BSL' | 'DGS' | 'LSF';
  category: 'Greetings' | 'Emergency' | 'Daily' | 'Questions' | 'Numbers' | 'General';
  hamnosys?: string;
  sigml?: string;
  handshape?: string;
  movement?: string;
  location?: string;
}

// Built-in curated Sign Dictionary covering ISL, ASL, BSL, DGS, LSF
export const CURATED_SIGN_DICTIONARY: Record<string, SignDictionaryEntry> = {
  // Greetings & Common
  hello: {
    id: 'c-0001',
    gloss: 'HELLO',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamextfingeru hampalmd hamforehead hamlrat hammover',
    sigml: `<hns_sign gloss="HELLO"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalmd/><hamforehead/><hamlrat/><hammover/></hamnosys_manual></hns_sign>`,
    handshape: 'Open B Flat Hand',
    movement: 'Salute outward movement from forehead',
    location: 'Head / Forehead',
  },
  hi: {
    id: 'c-0001b',
    gloss: 'HI',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamextfingeru hampalmd hamshoulders hammover',
    sigml: `<hns_sign gloss="HI"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalmd/><hamshoulders/><hammover/></hamnosys_manual></hns_sign>`,
    handshape: 'Open B Hand',
    movement: 'Wave right hand',
    location: 'Neutral Space',
  },
  name: {
    id: 'c-0001d',
    gloss: 'NAME',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamsymmlr hamfinger23 hamextfingero hampalmd hamneutralspace hammoved hamsmallmod hamrepeatfromstart',
    sigml: `<hns_sign gloss="NAME"><hamnosys_manual><hamsymmlr/><hamfinger23/><hamextfingero/><hampalmd/><hamneutralspace/><hammoved/><hamsmallmod/><hamrepeatfromstart/></hamnosys_manual></hns_sign>`,
    handshape: 'H-Hand (Index & Middle)',
    movement: 'Tap crossed H-hands downward in neutral space',
    location: 'Neutral Space',
  },
  my: {
    id: 'c-0001e',
    gloss: 'MY',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamextfingeru hampalml hamchest hamtouch',
    sigml: `<hns_sign gloss="MY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Flat hand',
    movement: 'Press palm to chest',
    location: 'Chest',
  },
  you: {
    id: 'c-0001f',
    gloss: 'YOU',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamfinger1 hamextfingero hampalmd hamchest hammoveo',
    sigml: `<hns_sign gloss="YOU"><hamnosys_manual><hamfinger1/><hamextfingero/><hampalmd/><hamchest/><hammoveo/></hamnosys_manual></hns_sign>`,
    handshape: 'Index finger pointing',
    movement: 'Point forward',
    location: 'Neutral Space',
  },
  namaste: {
    id: 'c-0001c',
    gloss: 'NAMASTE',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamsymmlr hamflathand hamextfingeru hampalml hamchest hamtouch',
    sigml: `<hns_sign gloss="NAMASTE"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Both Open Flat Hands joined',
    movement: 'Pressed together at chest level with slight nod',
    location: 'Chest',
  },
  thanks: {
    id: 'c-0002',
    gloss: 'THANK-YOU',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamthumboutmod hamextfingeru hambetween hamextfingerul hampalml hamunderchin hamseqbegin hamtouch hamfingerpad hamseqend hamparbegin hammovedo hamsmallmod hamparend',
    sigml: `<hns_sign gloss="THANK-YOU"><hamnosys_manual><hamflathand/><hamthumboutmod/><hamextfingeru/><hambetween/><hamextfingerul/><hampalml/><hamunderchin/><hamseqbegin/><hamtouch/><hamfingerpad/><hamseqend/><hamparbegin/><hammovedo/><hamsmallmod/><hamparend/></hamnosys_manual></hns_sign>`,
    handshape: 'Flat hand',
    movement: 'Fingertips touch chin then extend forward',
    location: 'Chin / Mouth',
  },
  thankyou: {
    id: 'c-0002b',
    gloss: 'THANK-YOU',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamthumboutmod hamextfingeru hambetween hamextfingerul hampalml hamunderchin hamseqbegin hamtouch hamfingerpad hamseqend hamparbegin hammovedo hamsmallmod hamparend',
    sigml: `<hns_sign gloss="THANK-YOU"><hamnosys_manual><hamflathand/><hamthumboutmod/><hamextfingeru/><hambetween/><hamextfingerul/><hampalml/><hamunderchin/><hamseqbegin/><hamtouch/><hamfingerpad/><hamseqend/><hamparbegin/><hammovedo/><hamsmallmod/><hamparend/></hamnosys_manual></hns_sign>`,
    handshape: 'Flat hand',
    movement: 'Fingertips touch chin then extend forward',
    location: 'Chin / Mouth',
  },
  please: {
    id: 'c-0005',
    gloss: 'PLEASE',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamflathand hamextfingeru hampalml hamchest hamcirclei',
    sigml: `<hns_sign gloss="PLEASE"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamcirclei/></hamnosys_manual></hns_sign>`,
    handshape: 'Open B Hand',
    movement: 'Circular motion over chest',
    location: 'Chest',
  },
  sorry: {
    id: 'c-0006',
    gloss: 'SORRY',
    language: 'ISL',
    category: 'Greetings',
    hamnosys: 'hamfist hamthumboutmod hamextfingeru hampalml hamchest hamcirclei',
    sigml: `<hns_sign gloss="SORRY"><hamnosys_manual><hamfist/><hamextfingeru/><hamthumboutmod/><hampalml/><hamchest/><hamcirclei/></hamnosys_manual></hns_sign>`,
    handshape: 'Fist with thumb out (A-hand)',
    movement: 'Circular motion over chest',
    location: 'Chest',
  },

  // Emergency & Essential Assistance
  help: {
    id: 'c-0020',
    gloss: 'HELP',
    language: 'ISL',
    category: 'Emergency',
    hamnosys: 'hamsymmlr hamsplit hamfist hamflathand hamextfingeru hampalmu hamchest',
    sigml: `<hns_sign gloss="HELP"><hamnosys_manual><hamsymmlr/><hamsplit/><hamfist/><hamflathand/><hamextfingeru/><hampalmu/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Fist resting on open palm',
    movement: 'Both hands moving upward together',
    location: 'Neutral Space',
  },
  doctor: {
    id: 'c-0035',
    gloss: 'DOCTOR',
    language: 'ISL',
    category: 'Emergency',
    hamnosys: 'hamflathand hamextfingeru hampalml hamwristback hamtouch',
    sigml: `<hns_sign gloss="DOCTOR"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamwristback/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'M-hand / Curved fingers',
    movement: 'Tap fingertips on inner wrist twice (checking pulse)',
    location: 'Wrist',
  },
  hospital: {
    id: 'c-0036',
    gloss: 'HOSPITAL',
    language: 'ISL',
    category: 'Emergency',
    hamnosys: 'hamfinger23 hamextfingeru hampalml hamupperarm hamtouch',
    sigml: `<hns_sign gloss="HOSPITAL"><hamnosys_manual><hamfinger23/><hamextfingeru/><hampalml/><hamupperarm/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'H-hand (Index & Middle)',
    movement: 'Draw a cross on upper arm',
    location: 'Upper Arm',
  },
  danger: {
    id: 'c-0037',
    gloss: 'DANGER',
    language: 'ISL',
    category: 'Emergency',
    hamnosys: 'hamfist hamextfingeru hampalml hamchest',
    sigml: `<hns_sign gloss="DANGER"><hamnosys_manual><hamfist/><hamextfingeru/><hampalml/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Fist',
    movement: 'Upward sharp motion',
    location: 'Chest',
  },
  safe: {
    id: 'c-0038',
    gloss: 'SAFE',
    language: 'ISL',
    category: 'Emergency',
    hamnosys: 'hamsymmlr hamfist hamextfingeru hampalml hamchest',
    sigml: `<hns_sign gloss="SAFE"><hamnosys_manual><hamsymmlr/><hamfist/><hamextfingeru/><hampalml/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Crossed fists',
    movement: 'Uncross fists outward',
    location: 'Chest / Neutral Space',
  },

  // Questions
  what: {
    id: 'c-0040',
    gloss: 'WHAT',
    language: 'ISL',
    category: 'Questions',
    hamnosys: 'hamsymmlr hamflathand hamextfingero hampalmu hamchest',
    sigml: `<hns_sign gloss="WHAT"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingero/><hampalmu/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Open palms up',
    movement: 'Side to side shake',
    location: 'Neutral Space',
  },
  where: {
    id: 'c-0041',
    gloss: 'WHERE',
    language: 'ISL',
    category: 'Questions',
    hamnosys: 'hamfinger1 hamextfingeru hampalmo hamshoulders',
    sigml: `<hns_sign gloss="WHERE"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalmo/><hamshoulders/></hamnosys_manual></hns_sign>`,
    handshape: 'Index finger pointing up',
    movement: 'Side-to-side finger shake',
    location: 'Neutral Space',
  },
  who: {
    id: 'c-0042',
    gloss: 'WHO',
    language: 'ISL',
    category: 'Questions',
    hamnosys: 'hamfinger1 hamextfingeru hampalmo hamchin hamcirclei',
    sigml: `<hns_sign gloss="WHO"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalmo/><hamchin/><hamcirclei/></hamnosys_manual></hns_sign>`,
    handshape: 'Index finger',
    movement: 'Small circle near chin',
    location: 'Chin',
  },
  why: {
    id: 'c-0043',
    gloss: 'WHY',
    language: 'ISL',
    category: 'Questions',
    hamnosys: 'hamflathand hamforehead hamtouch',
    sigml: `<hns_sign gloss="WHY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamforehead/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Touch forehead then pull to Y-hand',
    movement: 'Downward pull from forehead',
    location: 'Forehead',
  },
  how: {
    id: 'c-0044',
    gloss: 'HOW',
    language: 'ISL',
    category: 'Questions',
    hamnosys: 'hamsymmlr hamflathand hamextfingerd hampalmd hamchest',
    sigml: `<hns_sign gloss="HOW"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingerd/><hampalmd/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Curved hands knuckles touching',
    movement: 'Roll palms upward',
    location: 'Chest',
  },

  // Daily Actions
  yes: {
    id: 'c-0003',
    gloss: 'YES',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hamfist hamextfingero hampalmd hamchest',
    sigml: `<hns_sign gloss="YES"><hamnosys_manual><hamfist/><hamextfingero/><hampalmd/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'S-hand (Fist)',
    movement: 'Nodding motion downward',
    location: 'Neutral Space',
  },
  no: {
    id: 'c-0004',
    gloss: 'NO',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hamfinger23 hamthumboutmod hamextfingero hampalmd hamchest',
    sigml: `<hns_sign gloss="NO"><hamnosys_manual><hamfinger23/><hamthumboutmod/><hamextfingero/><hampalmd/><hamchest/></hamnosys_manual></hns_sign>`,
    handshape: 'Index, middle finger and thumb',
    movement: 'Snap fingers together',
    location: 'Neutral Space',
  },
  eat: {
    id: 'c-0009',
    gloss: 'EAT',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hampinchall hamextfingeri hampalmd hamlips hamtouch',
    sigml: `<hns_sign gloss="EAT"><hamnosys_manual><hampinchall/><hamextfingeri/><hampalmd/><hamlips/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Flattened O-hand',
    movement: 'Move to mouth repeatedly',
    location: 'Mouth / Lips',
  },
  food: {
    id: 'c-0009b',
    gloss: 'FOOD',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hampinchall hamextfingeri hampalmd hamlips hamtouch',
    sigml: `<hns_sign gloss="FOOD"><hamnosys_manual><hampinchall/><hamextfingeri/><hampalmd/><hamlips/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Flattened O-hand',
    movement: 'Move to mouth repeatedly',
    location: 'Mouth / Lips',
  },
  water: {
    id: 'c-0010',
    gloss: 'WATER',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hamfinger2345 hamthumboutmod hamextfingeru hampalml hamchin hamtouch',
    sigml: `<hns_sign gloss="WATER"><hamnosys_manual><hamfinger2345/><hamthumboutmod/><hamextfingeru/><hampalml/><hamchin/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'W-hand (3 fingers open)',
    movement: 'Tap index finger on chin',
    location: 'Chin',
  },
  home: {
    id: 'c-0012',
    gloss: 'HOME',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hampinchall hamextfingeri hampalmd hamcheek hamtouch',
    sigml: `<hns_sign gloss="HOME"><hamnosys_manual><hampinchall/><hamextfingeri/><hampalmd/><hamcheek/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Flattened O-hand',
    movement: 'Touch cheek near mouth, then cheek near ear',
    location: 'Cheek',
  },
  love: {
    id: 'c-0018',
    gloss: 'LOVE',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hamsymmlr hamfist hamextfingeru hampalmu hamchest hamtouch',
    sigml: `<hns_sign gloss="LOVE"><hamnosys_manual><hamsymmlr/><hamfist/><hamextfingeru/><hampalmu/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Crossed fists over heart',
    movement: 'Hug chest',
    location: 'Chest',
  },
  friend: {
    id: 'c-0021',
    gloss: 'FRIEND',
    language: 'ISL',
    category: 'Daily',
    hamnosys: 'hamsymmlr hamfinger1 hamextfingero hampalmd hamchest hamtouch',
    sigml: `<hns_sign gloss="FRIEND"><hamnosys_manual><hamsymmlr/><hamfinger1/><hamextfingero/><hampalmd/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>`,
    handshape: 'Hooked index fingers',
    movement: 'Interlock index fingers then reverse',
    location: 'Neutral Space',
  },
  may: {
    id: 'c-0022',
    gloss: 'MAY',
    language: 'ISL',
    category: 'General',
    hamnosys: 'hamflathand hamextfingeru hampalml hamchest hammoveo',
    sigml: `<hns_sign gloss="MAY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hammoveo/></hamnosys_manual></hns_sign>`,
    handshape: 'Open Flat Hand',
    movement: 'Forward movement at chest level',
    location: 'Chest / Neutral Space',
  },
};

// Alphabet Fingerspelling Map for SiGML fallback
export const ALPHABET_SIGML_MAP: Record<string, string> = {
  a: `<hns_sign gloss="A"><hamnosys_manual><hamfist/><hamextfingeru/><hamthumboutmod/><hampalml/></hamnosys_manual></hns_sign>`,
  b: `<hns_sign gloss="B"><hamnosys_manual><hamflathand/><hamextfingeru/><hamthumbacrossmod/><hampalmd/></hamnosys_manual></hns_sign>`,
  c: `<hns_sign gloss="C"><hamnosys_manual><hamceeall/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  d: `<hns_sign gloss="D"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  e: `<hns_sign gloss="E"><hamnosys_manual><hamflathand/><hamextfingeru/><hamfingerbendmod/><hamthumbacrossmod/><hampalmd/></hamnosys_manual></hns_sign>`,
  f: `<hns_sign gloss="F"><hamnosys_manual><hampinch12open/><hamextfingeru/><hampalmd/></hamnosys_manual></hns_sign>`,
  g: `<hns_sign gloss="G"><hamnosys_manual><hamfinger1/><hamextfingero/><hamthumboutmod/><hampalmd/></hamnosys_manual></hns_sign>`,
  h: `<hns_sign gloss="H"><hamnosys_manual><hamfinger23/><hamextfingero/><hamthumboutmod/><hampalmd/></hamnosys_manual></hns_sign>`,
  i: `<hns_sign gloss="I"><hamnosys_manual><hampinky/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  j: `<hns_sign gloss="J"><hamnosys_manual><hampinky/><hamextfingeru/><hampalml/><hamcirclei/></hamnosys_manual></hns_sign>`,
  k: `<hns_sign gloss="K"><hamnosys_manual><hamfinger23/><hamextfingeru/><hamthumboutmod/><hampalml/></hamnosys_manual></hns_sign>`,
  l: `<hns_sign gloss="L"><hamnosys_manual><hamfinger1/><hamextfingeru/><hamthumboutmod/><hampalml/></hamnosys_manual></hns_sign>`,
  m: `<hns_sign gloss="M"><hamnosys_manual><hamfist/><hamextfingerd/><hamthumbacrossmod/><hampalml/></hamnosys_manual></hns_sign>`,
  n: `<hns_sign gloss="N"><hamnosys_manual><hamfist/><hamextfingerd/><hamthumbacrossmod/><hampalml/></hamnosys_manual></hns_sign>`,
  o: `<hns_sign gloss="O"><hamnosys_manual><hamceeall/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  p: `<hns_sign gloss="P"><hamnosys_manual><hamfinger23/><hamextfingerd/><hamthumboutmod/><hampalml/></hamnosys_manual></hns_sign>`,
  q: `<hns_sign gloss="Q"><hamnosys_manual><hamfinger1/><hamextfingerd/><hamthumboutmod/><hampalmd/></hamnosys_manual></hns_sign>`,
  r: `<hns_sign gloss="R"><hamnosys_manual><hamfinger23/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  s: `<hns_sign gloss="S"><hamnosys_manual><hamfist/><hamextfingeru/><hamthumbacrossmod/><hampalml/></hamnosys_manual></hns_sign>`,
  t: `<hns_sign gloss="T"><hamnosys_manual><hamfist/><hamextfingeru/><hamthumbacrossmod/><hampalml/></hamnosys_manual></hns_sign>`,
  u: `<hns_sign gloss="U"><hamnosys_manual><hamfinger23/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  v: `<hns_sign gloss="V"><hamnosys_manual><hamfinger23/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  w: `<hns_sign gloss="W"><hamnosys_manual><hamfinger234/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  x: `<hns_sign gloss="X"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalml/></hamnosys_manual></hns_sign>`,
  y: `<hns_sign gloss="Y"><hamnosys_manual><hampinky/><hamextfingeru/><hamthumboutmod/><hampalml/></hamnosys_manual></hns_sign>`,
  z: `<hns_sign gloss="Z"><hamnosys_manual><hamfinger1/><hamextfingero/><hampalmd/><hamcirclei/></hamnosys_manual></hns_sign>`,
};

export interface ProcessedSignSequence {
  tokens: string[];
  sigmlSequence: string;
  signBreakdown: {
    word: string;
    gloss: string;
    isFingerspelled: boolean;
    hamnosys?: string;
    sigml: string;
  }[];
  facialExpression?: string;
  plannerSource?: string;
}

// CWASA ANTLR Grammar Token Whitelist
const VALID_HAMNOSYS_TOKENS = new Set([
  'hamtab', 'hamlinefeed', 'hampagebreak', 'hamreturn', 'hamversion40', 'hamspace', 'hamexclaim', 'hamquery',
  'hamfullstop', 'hamcomma', 'hamplus', 'hammetaalt', 'hamclocku', 'hamclockul', 'hamclockl', 'hamclockdl',
  'hamclockd', 'hamclockdr', 'hamclockr', 'hamclockur', 'hamclockfull', 'hamsymmpar', 'hamsymmlr', 'hamfist',
  'hamflathand', 'hamfinger2', 'hamfinger23', 'hamfinger23spread', 'hamfinger2345', 'hamthumboutmod',
  'hamthumbacrossmod', 'hampinch12', 'hampinchall', 'hampinch12open', 'hamcee12', 'hamceeall', 'hamcee12open',
  'hamthumbopenmod', 'hamfingerstraightmod', 'hamfingerbendmod', 'hamfingerhookedmod', 'hamnondominant',
  'hamdoublebent', 'hamdoublehooked', 'hamextfingeru', 'hamextfingerur', 'hamextfingerr', 'hamextfingerdr',
  'hamextfingerd', 'hamextfingerdl', 'hamextfingerl', 'hamextfingerul', 'hamextfingerol', 'hamextfingero',
  'hamextfingeror', 'hamextfingeril', 'hamextfingeri', 'hamextfingerir', 'hamextfingerui', 'hamextfingerdi',
  'hamextfingerdo', 'hamextfingeruo', 'hamearlobe', 'hamnostrils', 'hamshouldertop', 'hampalmu', 'hampalmur',
  'hampalmr', 'hampalmdr', 'hampalmd', 'hampalmdl', 'hampalml', 'hampalmul', 'hamreplace', 'hamarmextended',
  'hambehind', 'hametc', 'hamorirelative', 'hamtongue', 'hamteeth', 'hamstomach', 'hamneutralspace', 'hamhead',
  'hamheadtop', 'hamforehead', 'hameyebrows', 'hameyes', 'hamnose', 'hamear', 'hamcheek', 'hamlips', 'hamchin',
  'hamunderchin', 'hamneck', 'hamshoulders', 'hamchest', 'hambelowstomach', 'hamlrbeside', 'hamlrat', 'hamupperarm',
  'hamelbow', 'hamelbowinside', 'hamlowerarm', 'hamwristback', 'hamwristpulse', 'hamthumbball', 'hampalm',
  'hamhandback', 'hamthumb', 'hamindexfinger', 'hammiddlefinger', 'hamringfinger', 'hampinky', 'hamthumbside',
  'hampinkyside', 'hambetween', 'hamfingertip', 'hamfingernail', 'hamfingerpad', 'hamfingermidjoint', 'hamfingerbase',
  'hamfingerside', 'hamwristtopulse', 'hamwristtoback', 'hamwristtothumb', 'hamwristtopinky', 'hamcoreftag',
  'hamcorefref', 'hamnomotion', 'hammoveu', 'hammoveur', 'hammover', 'hammovedr', 'hammoved', 'hammovedl',
  'hammovel', 'hammoveul', 'hammoveol', 'hammoveo', 'hammoveor', 'hammoveil', 'hammovei', 'hammoveir',
  'hammoveui', 'hammovedi', 'hammovedo', 'hammoveuo', 'hammovecross', 'hammovex', 'hamsmallmod', 'hamlargemod',
  'hamarcl', 'hamarcu', 'hamarcr', 'hamarcd', 'hamwavy', 'hamzigzag', 'hamfingerplay', 'hamparbegin', 'hamparend',
  'hamcircleo', 'hamcirclei', 'hamcircled', 'hamcircleu', 'hamcirclel', 'hamcircler', 'hamincreasing',
  'hamdecreasing', 'hamclose', 'hamtouch', 'haminterlock', 'hamcross', 'hamfast', 'hamslow', 'hamtense',
  'hamrest', 'hamhalt', 'hamrepeatfromstart', 'hamrepeatfromstartseveral', 'hamrepeatcontinue',
  'hamrepeatcontinueseveral', 'hamseqbegin', 'hamseqend', 'hamalternatingmotion', 'hamrepeatreverse',
  'hambrushing', 'hamnonipsi', 'hamellipseh', 'hamellipseur', 'hamellipsev', 'hamellipseul', 'hammime',
  'hamaltbegin', 'hamaltend', 'hamnodding', 'hamswinging', 'hamtwisting', 'hamstircw', 'hamstirccw',
  'hamfusionbegin', 'hamfusionend', 'hamcircleul', 'hamcircledr', 'hamcircleur', 'hamcircledl', 'hamcircleol',
  'hamcircleir', 'hamcircleor', 'hamcircleil', 'hamcircledo', 'hamcircleui', 'hamcircledi', 'hamcircleuo'
]);

export function sanitizeSigml(sigml: any): string {
  if (!sigml) return '';
  if (typeof sigml !== 'string') {
    if (typeof sigml === 'object') {
      if (typeof sigml.sigml === 'string') {
        sigml = sigml.sigml;
      } else {
        return '';
      }
    } else {
      sigml = String(sigml);
    }
  }
  if (typeof sigml !== 'string' || sigml.includes('[object Object]')) {
    return '';
  }
  let cleaned = sigml;

  // Replacements for common typos / invalid tokens
  cleaned = cleaned.replace(/\bhamcircle\b/gi, 'hamcirclei');
  cleaned = cleaned.replace(/\bhamwrist\b/gi, 'hamwristback');
  cleaned = cleaned.replace(/\bhamfinger345\b/gi, 'hamfinger2345');

  // Lowercase all HamNoSys tokens & tags (e.g. HamFlathand -> hamflathand, <HamFinger2/> -> <hamfinger2/>)
  cleaned = cleaned.replace(/\b(ham[a-zA-Z0-9_]*)\b/gi, (m) => m.toLowerCase());

  // Convert plain space-separated text tokens to self-closing XML elements if not already XML tags
  cleaned = cleaned.replace(/(^|>|\s)(ham[a-z0-9_]+)(?=$|<|\s)/g, (match, prefix, token) => {
    return `${prefix}<${token}/>`;
  });

  // Clean double initial handshape at start of <hamnosys_manual>
  cleaned = cleaned.replace(
    /(<hamnosys_manual\s*>)\s*<hamflathand\s*\/?>\s*(<ham(?:finger|fist|pinch|cee)[a-z0-9_]*\s*\/?>)/gi,
    '$1$2'
  );

  // Clean orphan or invalid <hamreplace/> tags or bare hamreplace tags
  cleaned = cleaned.replace(/(<hamparbegin\s*\/?>\s*)<hamreplace\s*\/?>/gi, '$1');
  cleaned = cleaned.replace(/<hamreplace\s*\/?>\s*(?=<hamparend\s*\/?>)/gi, '');
  cleaned = cleaned.replace(/<hamreplace\s*\/?>/gi, '');

  // Clean duplicate hamsplit tags
  cleaned = cleaned.replace(/(?:<hamsplit\/>\s*)+/gi, '<hamsplit/>');

  // Clean bare <hamplus/> outside <hamparbegin>
  if (!cleaned.toLowerCase().includes('<hamparbegin')) {
    cleaned = cleaned.replace(/<hamplus\s*\/?>/gi, '');
  }

  // Automatically insert missing <hamsplit/> between two handshapes under two-handed symmetry
  if (!cleaned.includes('<hamsplit/>')) {
    cleaned = cleaned.replace(/(<hamfist\/>)\s*(<hamflathand\/>)/gi, '<hamsplit/>$1$2');
  }

  // Fix thumb modifier ordering (must follow extfinger)
  cleaned = cleaned.replace(
    /(<(?:hamthumboutmod|hamthumbacrossmod|hamthumbopenmod)\s*\/?>\s*)(<hamextfinger[a-z0-9]+\s*\/?>)/gi,
    '$2$1'
  );

  // Prepend default initial handshape if manual sequence begins without a valid initial handshape
  cleaned = cleaned.replace(
    /(<hamnosys_manual\s*>)(?=\s*<(?:hamextfinger|hampalm|hamchest|hamshoulders|hamchin|hamforehead|hamhead|hamface|hamunderchin|hamneck|hamwrist|hamtouch|hammove|hamcircle)[a-z0-9_]*\s*\/?>)/gi,
    '$1<hamflathand/>'
  );

  // Strip non-standard finger AST tokens that trigger ANTLR parser errors in manual sequence
  cleaned = cleaned.replace(
    /<(?:hammiddlefinger|hamringfinger|hampinky|hamthumb|hamindexfinger|hamfingerpad|hamfingertip|hamfingernail|hamfingermidjoint|hamfingerbase|hamfingerside)\s*\/?>/gi,
    ''
  );

  const STRUCTURAL_TAGS = new Set(['hamnosys_manual', 'hamnosys_nonmanual', 'hns_sign', 'sigml', 'hnms_sign', 'hns_motion', 'hns_handshape']);
  const ALIAS_MAP: Record<string, string> = {
    fingerhookmod: 'hamfingerhookedmod',
    split: 'hamsplit',
    finger1: 'hamfinger1',
    palmo: 'hampalmo',
    ceeopen: 'hamceeallopen',
    finger234: 'hamfinger2345',
    hamfinger234: 'hamfinger2345',
    finger345: 'hamfinger2345',
    hamfinger345: 'hamfinger2345',
  };

  // Filter out any XML tag `<ham.../>` that is NOT in VALID_HAMNOSYS_TOKENS or STRUCTURAL_TAGS
  cleaned = cleaned.replace(/<ham([a-z0-9_]+)\s*\/?>/gi, (fullTag, tokenName) => {
    const lowerName = tokenName.toLowerCase();
    const fullTname = `ham${lowerName}`;
    if (STRUCTURAL_TAGS.has(fullTname) || STRUCTURAL_TAGS.has(lowerName)) {
      return fullTag;
    }
    if (ALIAS_MAP[lowerName]) {
      return `<${ALIAS_MAP[lowerName]}/>`;
    }
    if (ALIAS_MAP[fullTname]) {
      return `<${ALIAS_MAP[fullTname]}/>`;
    }
    if (VALID_HAMNOSYS_TOKENS.has(fullTname)) {
      return `<${fullTname}/>`;
    }
    if (VALID_HAMNOSYS_TOKENS.has(lowerName)) {
      return `<${lowerName}/>`;
    }
    console.warn(`[SiGML Sanitizer] Stripped unrecognized HamNoSys token: <${tokenName}/>`);
    return '';
  });

  // Clean inter-tag whitespace
  cleaned = cleaned.replace(/>\s+</g, '><');

  // If input contains <hns_sign>, strip inner xml headers and ensure single root <sigml>
  if (cleaned.includes('<hns_sign')) {
    const innerContent = cleaned
      .replace(/<\?xml[^>]*\?>/gi, '')
      .replace(/<\/?sigml>/gi, '')
      .trim();
    cleaned = `<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${innerContent}\n</sigml>`;
  }

  return cleaned.trim();
}

class SignDictionaryService {
  /**
   * Fetch full NLP sign language plan from Kozha Backend microservice (Port 8001)
   */
  public async fetchKozhaPlan(
    text: string, 
    signLanguage: string = 'BSL',
    useAi: boolean = true
  ): Promise<ProcessedSignSequence> {
    if (!text || !text.trim()) {
      return { tokens: [], sigmlSequence: '', signBreakdown: [] };
    }

    try {
      const response = await fetch('http://localhost:8001/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: 'en',
          sign_language: signLanguage.toLowerCase(),
          use_ai: useAi,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.sigml) {
          return {
            tokens: data.glosses || [],
            sigmlSequence: sanitizeSigml(data.sigml),
            signBreakdown: (data.signBreakdown || []).map((sb: any) => ({
              word: sb.word,
              gloss: sb.gloss,
              isFingerspelled: sb.isFingerspelled,
              sigml: sanitizeSigml(sb.sigml),
            })),
            facialExpression: data.facial_expression || 'neutral',
            plannerSource: data.planner_source || 'LOCAL_ENGINE',
          };
        }
      }
    } catch (err) {
      console.warn('Kozha SL Engine server offline, using local fallback:', err);
    }

    // Fallback to local processTextToSign if server unreachable
    return this.processTextToSign(text, signLanguage);
  }

  /**
   * Synchronous local process raw text into SiGML sequence
   */
  public processTextToSign(text: string, language: string = 'BSL'): ProcessedSignSequence {
    if (!text || !text.trim()) {
      return { tokens: [], sigmlSequence: '', signBreakdown: [] };
    }

    let cleanedText = text.toLowerCase();
    
    // Quick phrase replacements
    cleanedText = cleanedText
      .replace(/thank\s+you/g, 'thanks')
      .replace(/good\s+morning/g, 'morning')
      .replace(/how\s+are\s+you/g, 'how you')
      .replace(/what\s+is\s+your\s+name/g, 'you name what');

    const cleanTokens = cleanedText
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const synonymMap: Record<string, string> = {
      doctors: 'doctor',
      physician: 'doctor',
      hospitals: 'hospital',
      eating: 'eat',
      foods: 'food',
      helping: 'help',
      helped: 'help',
      thankyou: 'thanks',
      hi: 'hello',
      hey: 'hello',
    };

    const signBreakdown: ProcessedSignSequence['signBreakdown'] = [];
    const sigmlBlocks: string[] = [];

    cleanTokens.forEach((rawToken) => {
      const token = synonymMap[rawToken] || rawToken;
      const match = CURATED_SIGN_DICTIONARY[token];

      if (match && match.sigml) {
        const cleanSigml = sanitizeSigml(match.sigml);
        signBreakdown.push({
          word: token,
          gloss: match.gloss,
          isFingerspelled: false,
          hamnosys: match.hamnosys,
          sigml: cleanSigml,
        });
        sigmlBlocks.push(cleanSigml);
      } else {
        const charSigmlBlocks: string[] = [];
        for (const char of token.split('')) {
          if (ALPHABET_SIGML_MAP[char]) {
            const cleanCharSigml = sanitizeSigml(ALPHABET_SIGML_MAP[char]);
            charSigmlBlocks.push(cleanCharSigml);
            signBreakdown.push({
              word: char.toUpperCase(),
              gloss: `LETTER: ${char.toUpperCase()}`,
              isFingerspelled: true,
              hamnosys: 'Fingerspelling letter',
              sigml: cleanCharSigml,
            });
          }
        }
        if (charSigmlBlocks.length > 0) {
          sigmlBlocks.push(...charSigmlBlocks);
        }
      }
    });

    const fullSigml = `<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${sigmlBlocks.join('\n')}\n</sigml>`;

    return {
      tokens: cleanTokens,
      sigmlSequence: fullSigml,
      signBreakdown,
      facialExpression: 'neutral',
      plannerSource: 'LOCAL_FALLBACK',
    };
  }

  /**
   * Search dictionary entries
   */
  public searchEntries(query: string = '', category: string = 'All'): SignDictionaryEntry[] {
    const entries = Object.values(CURATED_SIGN_DICTIONARY);
    return entries.filter((entry) => {
      const matchesCategory = category === 'All' || entry.category === category;
      const matchesQuery =
        !query ||
        entry.gloss.toLowerCase().includes(query.toLowerCase()) ||
        entry.id.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }
}

export const signDictionaryService = new SignDictionaryService();


