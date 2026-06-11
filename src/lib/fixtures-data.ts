export type FixtureSeed = {
  home_team: string;
  away_team: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_at: string; // ISO UTC
  stage: "group" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
  group_name: string | null;
  venue: string;
  status: "upcoming" | "live" | "finished";
  predictions_locked_at?: string;
};

// Flag emoji lookup (used by UI layer)
export const FLAG: Record<string, string> = {
  MEX: "🇲🇽", POL: "🇵🇱", KSA: "🇸🇦", ARG: "🇦🇷",
  USA: "🇺🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", IRN: "🇮🇷", NED: "🇳🇱",
  CAN: "🇨🇦", BEL: "🇧🇪", MAR: "🇲🇦", CRO: "🇭🇷",
  FRA: "🇫🇷", AUS: "🇦🇺", DEN: "🇩🇰", TUN: "🇹🇳",
  ESP: "🇪🇸", CRC: "🇨🇷", GER: "🇩🇪", JPN: "🇯🇵",
  BRA: "🇧🇷", SUI: "🇨🇭", SRB: "🇷🇸", CMR: "🇨🇲",
  POR: "🇵🇹", GHA: "🇬🇭", KOR: "🇰🇷", URU: "🇺🇾",
  SEN: "🇸🇳", ECU: "🇪🇨", QAT: "🇶🇦", WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  TBD: "🏳️",
};

// md3 = matchday 3 (simultaneous, lock 15 min before)
function md3lock(kickoff: string) {
  const d = new Date(new Date(kickoff).getTime() - 15 * 60 * 1000);
  return d.toISOString();
}

export const FIXTURES_SEED: FixtureSeed[] = [
  // ═══════════════════════════════════════════════
  // GROUP A — Mexico · Poland · Saudi Arabia · Argentina
  // ═══════════════════════════════════════════════
  {
    home_team: "Mexico", away_team: "Poland",
    home_team_code: "MEX", away_team_code: "POL",
    kickoff_at: "2026-06-11T15:00:00Z", stage: "group", group_name: "A",
    venue: "Azteca Stadium, Mexico City", status: "upcoming",
  },
  {
    home_team: "Saudi Arabia", away_team: "Argentina",
    home_team_code: "KSA", away_team_code: "ARG",
    kickoff_at: "2026-06-11T18:00:00Z", stage: "group", group_name: "A",
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "Mexico", away_team: "Saudi Arabia",
    home_team_code: "MEX", away_team_code: "KSA",
    kickoff_at: "2026-06-16T15:00:00Z", stage: "group", group_name: "A",
    venue: "Estadio BBVA, Monterrey", status: "upcoming",
  },
  {
    home_team: "Poland", away_team: "Argentina",
    home_team_code: "POL", away_team_code: "ARG",
    kickoff_at: "2026-06-16T21:00:00Z", stage: "group", group_name: "A",
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "Poland", away_team: "Saudi Arabia",
    home_team_code: "POL", away_team_code: "KSA",
    kickoff_at: "2026-06-22T19:00:00Z", stage: "group", group_name: "A",
    venue: "Lincoln Financial Field, Philadelphia", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-22T19:00:00Z"),
  },
  {
    home_team: "Argentina", away_team: "Mexico",
    home_team_code: "ARG", away_team_code: "MEX",
    kickoff_at: "2026-06-22T19:00:00Z", stage: "group", group_name: "A",
    venue: "Hard Rock Stadium, Miami", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-22T19:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP B — USA · England · Iran · Netherlands
  // ═══════════════════════════════════════════════
  {
    home_team: "USA", away_team: "England",
    home_team_code: "USA", away_team_code: "ENG",
    kickoff_at: "2026-06-12T18:00:00Z", stage: "group", group_name: "B",
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "Iran", away_team: "Netherlands",
    home_team_code: "IRN", away_team_code: "NED",
    kickoff_at: "2026-06-12T21:00:00Z", stage: "group", group_name: "B",
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "USA", away_team: "Iran",
    home_team_code: "USA", away_team_code: "IRN",
    kickoff_at: "2026-06-17T15:00:00Z", stage: "group", group_name: "B",
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
  },
  {
    home_team: "England", away_team: "Netherlands",
    home_team_code: "ENG", away_team_code: "NED",
    kickoff_at: "2026-06-17T21:00:00Z", stage: "group", group_name: "B",
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
  },
  {
    home_team: "England", away_team: "Iran",
    home_team_code: "ENG", away_team_code: "IRN",
    kickoff_at: "2026-06-22T23:00:00Z", stage: "group", group_name: "B",
    venue: "Gillette Stadium, Boston", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-22T23:00:00Z"),
  },
  {
    home_team: "Netherlands", away_team: "USA",
    home_team_code: "NED", away_team_code: "USA",
    kickoff_at: "2026-06-22T23:00:00Z", stage: "group", group_name: "B",
    venue: "Arrowhead Stadium, Kansas City", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-22T23:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP C — Canada · Belgium · Morocco · Croatia
  // ═══════════════════════════════════════════════
  {
    home_team: "Canada", away_team: "Belgium",
    home_team_code: "CAN", away_team_code: "BEL",
    kickoff_at: "2026-06-12T15:00:00Z", stage: "group", group_name: "C",
    venue: "BMO Field, Toronto", status: "upcoming",
  },
  {
    home_team: "Morocco", away_team: "Croatia",
    home_team_code: "MAR", away_team_code: "CRO",
    kickoff_at: "2026-06-13T00:00:00Z", stage: "group", group_name: "C",
    venue: "BC Place, Vancouver", status: "upcoming",
  },
  {
    home_team: "Canada", away_team: "Morocco",
    home_team_code: "CAN", away_team_code: "MAR",
    kickoff_at: "2026-06-17T18:00:00Z", stage: "group", group_name: "C",
    venue: "BMO Field, Toronto", status: "upcoming",
  },
  {
    home_team: "Belgium", away_team: "Croatia",
    home_team_code: "BEL", away_team_code: "CRO",
    kickoff_at: "2026-06-18T00:00:00Z", stage: "group", group_name: "C",
    venue: "Mercedes-Benz Stadium, Atlanta", status: "upcoming",
  },
  {
    home_team: "Belgium", away_team: "Morocco",
    home_team_code: "BEL", away_team_code: "MAR",
    kickoff_at: "2026-06-23T19:00:00Z", stage: "group", group_name: "C",
    venue: "Commanders Field, Washington D.C.", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-23T19:00:00Z"),
  },
  {
    home_team: "Croatia", away_team: "Canada",
    home_team_code: "CRO", away_team_code: "CAN",
    kickoff_at: "2026-06-23T19:00:00Z", stage: "group", group_name: "C",
    venue: "BC Place, Vancouver", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-23T19:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP D — France · Australia · Denmark · Tunisia
  // ═══════════════════════════════════════════════
  {
    home_team: "France", away_team: "Australia",
    home_team_code: "FRA", away_team_code: "AUS",
    kickoff_at: "2026-06-13T15:00:00Z", stage: "group", group_name: "D",
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "Denmark", away_team: "Tunisia",
    home_team_code: "DEN", away_team_code: "TUN",
    kickoff_at: "2026-06-13T18:00:00Z", stage: "group", group_name: "D",
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
  },
  {
    home_team: "France", away_team: "Denmark",
    home_team_code: "FRA", away_team_code: "DEN",
    kickoff_at: "2026-06-18T18:00:00Z", stage: "group", group_name: "D",
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
  },
  {
    home_team: "Australia", away_team: "Tunisia",
    home_team_code: "AUS", away_team_code: "TUN",
    kickoff_at: "2026-06-18T21:00:00Z", stage: "group", group_name: "D",
    venue: "Hard Rock Stadium, Miami", status: "upcoming",
  },
  {
    home_team: "France", away_team: "Tunisia",
    home_team_code: "FRA", away_team_code: "TUN",
    kickoff_at: "2026-06-23T23:00:00Z", stage: "group", group_name: "D",
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-23T23:00:00Z"),
  },
  {
    home_team: "Australia", away_team: "Denmark",
    home_team_code: "AUS", away_team_code: "DEN",
    kickoff_at: "2026-06-23T23:00:00Z", stage: "group", group_name: "D",
    venue: "Gillette Stadium, Boston", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-23T23:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP E — Spain · Costa Rica · Germany · Japan
  // ═══════════════════════════════════════════════
  {
    home_team: "Spain", away_team: "Costa Rica",
    home_team_code: "ESP", away_team_code: "CRC",
    kickoff_at: "2026-06-14T15:00:00Z", stage: "group", group_name: "E",
    venue: "Hard Rock Stadium, Miami", status: "upcoming",
  },
  {
    home_team: "Germany", away_team: "Japan",
    home_team_code: "GER", away_team_code: "JPN",
    kickoff_at: "2026-06-14T18:00:00Z", stage: "group", group_name: "E",
    venue: "Mercedes-Benz Stadium, Atlanta", status: "upcoming",
  },
  {
    home_team: "Spain", away_team: "Germany",
    home_team_code: "ESP", away_team_code: "GER",
    kickoff_at: "2026-06-19T21:00:00Z", stage: "group", group_name: "E",
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "Costa Rica", away_team: "Japan",
    home_team_code: "CRC", away_team_code: "JPN",
    kickoff_at: "2026-06-19T18:00:00Z", stage: "group", group_name: "E",
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "Spain", away_team: "Japan",
    home_team_code: "ESP", away_team_code: "JPN",
    kickoff_at: "2026-06-24T19:00:00Z", stage: "group", group_name: "E",
    venue: "Arrowhead Stadium, Kansas City", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-24T19:00:00Z"),
  },
  {
    home_team: "Costa Rica", away_team: "Germany",
    home_team_code: "CRC", away_team_code: "GER",
    kickoff_at: "2026-06-24T19:00:00Z", stage: "group", group_name: "E",
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-24T19:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP F — Brazil · Switzerland · Serbia · Cameroon
  // ═══════════════════════════════════════════════
  {
    home_team: "Brazil", away_team: "Serbia",
    home_team_code: "BRA", away_team_code: "SRB",
    kickoff_at: "2026-06-14T21:00:00Z", stage: "group", group_name: "F",
    venue: "Estadio Akron, Guadalajara", status: "upcoming",
  },
  {
    home_team: "Switzerland", away_team: "Cameroon",
    home_team_code: "SUI", away_team_code: "CMR",
    kickoff_at: "2026-06-15T00:00:00Z", stage: "group", group_name: "F",
    venue: "BC Place, Vancouver", status: "upcoming",
  },
  {
    home_team: "Brazil", away_team: "Switzerland",
    home_team_code: "BRA", away_team_code: "SUI",
    kickoff_at: "2026-06-20T21:00:00Z", stage: "group", group_name: "F",
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
  },
  {
    home_team: "Serbia", away_team: "Cameroon",
    home_team_code: "SRB", away_team_code: "CMR",
    kickoff_at: "2026-06-20T15:00:00Z", stage: "group", group_name: "F",
    venue: "Lincoln Financial Field, Philadelphia", status: "upcoming",
  },
  {
    home_team: "Brazil", away_team: "Cameroon",
    home_team_code: "BRA", away_team_code: "CMR",
    kickoff_at: "2026-06-24T23:00:00Z", stage: "group", group_name: "F",
    venue: "Commanders Field, Washington D.C.", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-24T23:00:00Z"),
  },
  {
    home_team: "Switzerland", away_team: "Serbia",
    home_team_code: "SUI", away_team_code: "SRB",
    kickoff_at: "2026-06-24T23:00:00Z", stage: "group", group_name: "F",
    venue: "Mercedes-Benz Stadium, Atlanta", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-24T23:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP G — Portugal · Ghana · South Korea · Uruguay
  // ═══════════════════════════════════════════════
  {
    home_team: "Portugal", away_team: "Ghana",
    home_team_code: "POR", away_team_code: "GHA",
    kickoff_at: "2026-06-15T15:00:00Z", stage: "group", group_name: "G",
    venue: "Gillette Stadium, Boston", status: "upcoming",
  },
  {
    home_team: "South Korea", away_team: "Uruguay",
    home_team_code: "KOR", away_team_code: "URU",
    kickoff_at: "2026-06-15T18:00:00Z", stage: "group", group_name: "G",
    venue: "Arrowhead Stadium, Kansas City", status: "upcoming",
  },
  {
    home_team: "Portugal", away_team: "South Korea",
    home_team_code: "POR", away_team_code: "KOR",
    kickoff_at: "2026-06-21T15:00:00Z", stage: "group", group_name: "G",
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "Ghana", away_team: "Uruguay",
    home_team_code: "GHA", away_team_code: "URU",
    kickoff_at: "2026-06-21T18:00:00Z", stage: "group", group_name: "G",
    venue: "Hard Rock Stadium, Miami", status: "upcoming",
  },
  {
    home_team: "Portugal", away_team: "Uruguay",
    home_team_code: "POR", away_team_code: "URU",
    kickoff_at: "2026-06-25T19:00:00Z", stage: "group", group_name: "G",
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-25T19:00:00Z"),
  },
  {
    home_team: "Ghana", away_team: "South Korea",
    home_team_code: "GHA", away_team_code: "KOR",
    kickoff_at: "2026-06-25T19:00:00Z", stage: "group", group_name: "G",
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-25T19:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // GROUP H — Senegal · Ecuador · Qatar · Wales
  // ═══════════════════════════════════════════════
  {
    home_team: "Senegal", away_team: "Ecuador",
    home_team_code: "SEN", away_team_code: "ECU",
    kickoff_at: "2026-06-15T21:00:00Z", stage: "group", group_name: "H",
    venue: "BMO Field, Toronto", status: "upcoming",
  },
  {
    home_team: "Qatar", away_team: "Wales",
    home_team_code: "QAT", away_team_code: "WAL",
    kickoff_at: "2026-06-16T00:00:00Z", stage: "group", group_name: "H",
    venue: "Azteca Stadium, Mexico City", status: "upcoming",
  },
  {
    home_team: "Senegal", away_team: "Qatar",
    home_team_code: "SEN", away_team_code: "QAT",
    kickoff_at: "2026-06-21T21:00:00Z", stage: "group", group_name: "H",
    venue: "Estadio BBVA, Monterrey", status: "upcoming",
  },
  {
    home_team: "Ecuador", away_team: "Wales",
    home_team_code: "ECU", away_team_code: "WAL",
    kickoff_at: "2026-06-21T00:00:00Z", stage: "group", group_name: "H",
    venue: "Lincoln Financial Field, Philadelphia", status: "upcoming",
  },
  {
    home_team: "Senegal", away_team: "Wales",
    home_team_code: "SEN", away_team_code: "WAL",
    kickoff_at: "2026-06-25T23:00:00Z", stage: "group", group_name: "H",
    venue: "Arrowhead Stadium, Kansas City", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-25T23:00:00Z"),
  },
  {
    home_team: "Ecuador", away_team: "Qatar",
    home_team_code: "ECU", away_team_code: "QAT",
    kickoff_at: "2026-06-25T23:00:00Z", stage: "group", group_name: "H",
    venue: "Estadio Akron, Guadalajara", status: "upcoming",
    predictions_locked_at: md3lock("2026-06-25T23:00:00Z"),
  },

  // ═══════════════════════════════════════════════
  // ROUND OF 16  (8 matches)
  // ═══════════════════════════════════════════════
  {
    home_team: "Winner Group A", away_team: "Runner-up Group B",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-28T19:00:00Z", stage: "round_of_16", group_name: null,
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "Winner Group C", away_team: "Runner-up Group D",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-28T23:00:00Z", stage: "round_of_16", group_name: null,
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "Winner Group B", away_team: "Runner-up Group A",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-29T19:00:00Z", stage: "round_of_16", group_name: null,
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
  },
  {
    home_team: "Winner Group D", away_team: "Runner-up Group C",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-29T23:00:00Z", stage: "round_of_16", group_name: null,
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
  },
  {
    home_team: "Winner Group E", away_team: "Runner-up Group F",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-30T19:00:00Z", stage: "round_of_16", group_name: null,
    venue: "Arrowhead Stadium, Kansas City", status: "upcoming",
  },
  {
    home_team: "Winner Group G", away_team: "Runner-up Group H",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-06-30T23:00:00Z", stage: "round_of_16", group_name: null,
    venue: "Mercedes-Benz Stadium, Atlanta", status: "upcoming",
  },
  {
    home_team: "Winner Group F", away_team: "Runner-up Group E",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-01T19:00:00Z", stage: "round_of_16", group_name: null,
    venue: "Hard Rock Stadium, Miami", status: "upcoming",
  },
  {
    home_team: "Winner Group H", away_team: "Runner-up Group G",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-01T23:00:00Z", stage: "round_of_16", group_name: null,
    venue: "Gillette Stadium, Boston", status: "upcoming",
  },

  // ═══════════════════════════════════════════════
  // QUARTER-FINALS  (4 matches)
  // ═══════════════════════════════════════════════
  {
    home_team: "QF1 — TBD", away_team: "QF2 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-04T19:00:00Z", stage: "quarter_final", group_name: null,
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "QF3 — TBD", away_team: "QF4 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-04T23:00:00Z", stage: "quarter_final", group_name: null,
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },
  {
    home_team: "QF5 — TBD", away_team: "QF6 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-05T19:00:00Z", stage: "quarter_final", group_name: null,
    venue: "SoFi Stadium, Los Angeles", status: "upcoming",
  },
  {
    home_team: "QF7 — TBD", away_team: "QF8 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-05T23:00:00Z", stage: "quarter_final", group_name: null,
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
  },

  // ═══════════════════════════════════════════════
  // SEMI-FINALS  (2 matches)
  // ═══════════════════════════════════════════════
  {
    home_team: "SF1 — TBD", away_team: "SF2 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-08T23:00:00Z", stage: "semi_final", group_name: null,
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
  {
    home_team: "SF3 — TBD", away_team: "SF4 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-09T23:00:00Z", stage: "semi_final", group_name: null,
    venue: "AT&T Stadium, Dallas", status: "upcoming",
  },

  // ═══════════════════════════════════════════════
  // THIRD PLACE PLAY-OFF
  // ═══════════════════════════════════════════════
  {
    home_team: "SF Loser 1 — TBD", away_team: "SF Loser 2 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-12T23:00:00Z", stage: "third_place", group_name: null,
    venue: "Levi's Stadium, San Francisco", status: "upcoming",
  },

  // ═══════════════════════════════════════════════
  // FINAL
  // ═══════════════════════════════════════════════
  {
    home_team: "Finalist 1 — TBD", away_team: "Finalist 2 — TBD",
    home_team_code: "TBD", away_team_code: "TBD",
    kickoff_at: "2026-07-15T23:00:00Z", stage: "final", group_name: null,
    venue: "MetLife Stadium, New Jersey", status: "upcoming",
  },
];
