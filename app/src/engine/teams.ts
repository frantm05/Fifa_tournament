import { ALL_VERSIONS, type GameVersion, type Team } from "./types";

/**
 * Team dataset, FIFA 17 → EA FC 26. Ratings are the latest-version baseline on
 * the 0.5–5 star scale and are approximate ("hodnocení orientační" in the UI).
 * Licensing reality is modeled via nameOverrides (Piemonte Calcio, Roma FC, …)
 * and via version spans (Saudi Pro League from FC 24, expansion MLS clubs, …).
 */

function span(from: number, to = 26): GameVersion[] {
  return ALL_VERSIONS.filter((v) => Number(v) >= from && Number(v) <= to);
}

function T(
  id: string,
  code: string,
  name: string,
  league: string,
  nation: string,
  stars: number,
  colors: [string, string],
  extra?: Partial<Team>,
): Team {
  return { id, code, name, league, nation, stars, versions: ALL_VERSIONS, colors, ...extra };
}

const PL = "Premier League";
const LL = "La Liga";
const SA = "Serie A";
const BL = "Bundesliga";
const L1 = "Ligue 1";
const ERE = "Eredivisie";
const LP = "Liga Portugal";
const TSL = "Süper Lig";
const SPL = "Saudi Pro League";
const MLS = "MLS";
const CH = "EFL Championship";
const SCO = "Scottish Premiership";
const NT = "Reprezentace";

export const TEAMS: Team[] = [
  // ---------------- Premier League (Anglie) ----------------
  T("arsenal", "ARS", "Arsenal", PL, "Anglie", 5, ["#EF0107", "#FFFFFF"]),
  T("man-city", "MCI", "Manchester City", PL, "Anglie", 5, ["#6CABDD", "#1C2C5B"]),
  T("liverpool", "LIV", "Liverpool", PL, "Anglie", 5, ["#C8102E", "#F6EB61"]),
  T("chelsea", "CHE", "Chelsea", PL, "Anglie", 4.5, ["#034694", "#FFFFFF"]),
  T("man-united", "MUN", "Manchester United", PL, "Anglie", 4.5, ["#DA291C", "#FBE122"]),
  T("tottenham", "TOT", "Tottenham Hotspur", PL, "Anglie", 4.5, ["#132257", "#FFFFFF"]),
  T("newcastle", "NEW", "Newcastle United", PL, "Anglie", 4.5, ["#241F20", "#FFFFFF"]),
  T("aston-villa", "AVL", "Aston Villa", PL, "Anglie", 4.5, ["#670E36", "#95BFE5"]),
  T("brighton", "BHA", "Brighton & Hove Albion", PL, "Anglie", 4, ["#0057B8", "#FFFFFF"]),
  T("west-ham", "WHU", "West Ham United", PL, "Anglie", 4, ["#7A263A", "#1BB1E7"]),
  T("crystal-palace", "CRY", "Crystal Palace", PL, "Anglie", 4, ["#1B458F", "#C4122E"]),
  T("brentford", "BRE", "Brentford", PL, "Anglie", 4, ["#E30613", "#FFFFFF"]),
  T("fulham", "FUL", "Fulham", PL, "Anglie", 4, ["#111111", "#FFFFFF"]),
  T("bournemouth", "BOU", "AFC Bournemouth", PL, "Anglie", 4, ["#DA291C", "#000000"]),
  T("everton", "EVE", "Everton", PL, "Anglie", 4, ["#003399", "#FFFFFF"]),
  T("nottm-forest", "NFO", "Nottingham Forest", PL, "Anglie", 4, ["#DD0000", "#FFFFFF"]),
  T("wolves", "WOL", "Wolverhampton Wanderers", PL, "Anglie", 3.5, ["#FDB913", "#231F20"]),
  T("leeds", "LEE", "Leeds United", PL, "Anglie", 3.5, ["#FFFFFF", "#1D428A"]),
  T("burnley", "BUR", "Burnley", PL, "Anglie", 3.5, ["#6C1D45", "#99D6EA"]),
  T("sunderland", "SUN", "Sunderland", PL, "Anglie", 3.5, ["#EB172B", "#FFFFFF"]),

  // ---------------- La Liga (Španělsko) ----------------
  T("real-madrid", "RMA", "Real Madrid", LL, "Španělsko", 5, ["#FFFFFF", "#FEBE10"]),
  T("barcelona", "BAR", "FC Barcelona", LL, "Španělsko", 5, ["#A50044", "#004D98"]),
  T("atletico", "ATM", "Atlético de Madrid", LL, "Španělsko", 4.5, ["#CB3524", "#FFFFFF"]),
  T("athletic", "ATH", "Athletic Club", LL, "Španělsko", 4.5, ["#EE2523", "#FFFFFF"]),
  T("villarreal", "VIL", "Villarreal CF", LL, "Španělsko", 4.5, ["#FFE667", "#005187"]),
  T("real-sociedad", "RSO", "Real Sociedad", LL, "Španělsko", 4, ["#0067B1", "#FFFFFF"]),
  T("betis", "BET", "Real Betis", LL, "Španělsko", 4, ["#00954C", "#FFFFFF"]),
  T("sevilla", "SEV", "Sevilla FC", LL, "Španělsko", 4, ["#FFFFFF", "#D8091E"]),
  T("valencia", "VAL", "Valencia CF", LL, "Španělsko", 4, ["#FFFFFF", "#EE3524"]),
  T("girona", "GIR", "Girona FC", LL, "Španělsko", 4, ["#CD2534", "#FFFFFF"]),
  T("osasuna", "OSA", "CA Osasuna", LL, "Španělsko", 3.5, ["#D91A21", "#0A346F"]),
  T("celta", "CEL", "Celta de Vigo", LL, "Španělsko", 3.5, ["#8AC3EE", "#E5254E"]),
  T("rayo", "RAY", "Rayo Vallecano", LL, "Španělsko", 3.5, ["#FFFFFF", "#E53027"]),
  T("mallorca", "MLL", "RCD Mallorca", LL, "Španělsko", 3.5, ["#E20613", "#000000"]),
  T("getafe", "GET", "Getafe CF", LL, "Španělsko", 3.5, ["#005999", "#FFFFFF"]),
  T("alaves", "ALA", "Deportivo Alavés", LL, "Španělsko", 3.5, ["#0761AF", "#FFFFFF"]),
  T("espanyol", "ESP", "RCD Espanyol", LL, "Španělsko", 3.5, ["#007FC8", "#FFFFFF"]),
  T("levante", "LEV", "Levante UD", LL, "Španělsko", 3, ["#005CA9", "#AD0C33"]),
  T("elche", "ELC", "Elche CF", LL, "Španělsko", 3, ["#05642C", "#FFFFFF"]),
  T("oviedo", "OVI", "Real Oviedo", LL, "Španělsko", 3, ["#0050A0", "#FFFFFF"]),

  // ---------------- Serie A (Itálie) ----------------
  T("inter", "INT", "Inter Milán", SA, "Itálie", 5, ["#0068A8", "#221F20"]),
  T("milan", "MIL", "AC Milán", SA, "Itálie", 4.5, ["#FB090B", "#000000"]),
  T("juventus", "JUV", "Juventus", SA, "Itálie", 4.5, ["#FFFFFF", "#000000"], {
    nameOverrides: { "20": "Piemonte Calcio", "21": "Piemonte Calcio", "22": "Piemonte Calcio" },
  }),
  T("napoli", "NAP", "SSC Neapol", SA, "Itálie", 4.5, ["#12A0D7", "#FFFFFF"], {
    nameOverrides: { "25": "Napoli FC", "26": "Napoli FC" },
  }),
  T("roma", "ROM", "AS Řím", SA, "Itálie", 4.5, ["#8E1F2F", "#F0BC42"], {
    nameOverrides: { "22": "Roma FC", "23": "Roma FC", "24": "Roma FC", "25": "Roma FC", "26": "Roma FC" },
  }),
  T("atalanta", "ATA", "Atalanta", SA, "Itálie", 4.5, ["#1E71B8", "#000000"], {
    nameOverrides: { "23": "Bergamo Calcio", "24": "Bergamo Calcio", "25": "Bergamo Calcio", "26": "Bergamo Calcio" },
  }),
  T("lazio", "LAZ", "Lazio Řím", SA, "Itálie", 4, ["#87D8F7", "#FFFFFF"], {
    nameOverrides: { "24": "Latium", "25": "Latium", "26": "Latium" },
  }),
  T("fiorentina", "FIO", "ACF Fiorentina", SA, "Itálie", 4, ["#582C83", "#FFFFFF"]),
  T("bologna", "BOL", "Bologna FC", SA, "Itálie", 4, ["#1A2F48", "#A21C26"]),
  T("torino", "TOR", "Turín FC", SA, "Itálie", 3.5, ["#8B1B23", "#FFFFFF"]),
  T("udinese", "UDI", "Udinese", SA, "Itálie", 3.5, ["#000000", "#FFFFFF"]),
  T("genoa", "GEN", "FC Janov", SA, "Itálie", 3.5, ["#AD1919", "#00285D"]),
  T("como", "COM", "Como 1907", SA, "Itálie", 3.5, ["#00519E", "#FFFFFF"], { versions: span(25) }),
  T("cagliari", "CAG", "Cagliari", SA, "Itálie", 3.5, ["#AD002A", "#00205B"]),
  T("verona", "VER", "Hellas Verona", SA, "Itálie", 3, ["#FFD100", "#00205B"]),
  T("lecce", "LEC", "US Lecce", SA, "Itálie", 3, ["#F5C300", "#DA291C"]),
  T("parma", "PAR", "Parma Calcio", SA, "Itálie", 3.5, ["#FFD200", "#004B87"]),
  T("sassuolo", "SAS", "Sassuolo", SA, "Itálie", 3.5, ["#00A752", "#000000"]),
  T("cremonese", "CRE", "Cremonese", SA, "Itálie", 3, ["#EE1C25", "#808285"]),
  T("pisa", "PIS", "Pisa SC", SA, "Itálie", 3, ["#00205B", "#000000"], { versions: span(26) }),

  // ---------------- Bundesliga (Německo) ----------------
  T("bayern", "FCB", "Bayern Mnichov", BL, "Německo", 5, ["#DC052D", "#FFFFFF"]),
  T("leverkusen", "B04", "Bayer Leverkusen", BL, "Německo", 4.5, ["#E32221", "#000000"]),
  T("dortmund", "BVB", "Borussia Dortmund", BL, "Německo", 4.5, ["#FDE100", "#000000"]),
  T("leipzig", "RBL", "RB Lipsko", BL, "Německo", 4.5, ["#DD0741", "#FFFFFF"]),
  T("frankfurt", "SGE", "Eintracht Frankfurt", BL, "Německo", 4, ["#E1000F", "#000000"]),
  T("stuttgart", "VFB", "VfB Stuttgart", BL, "Německo", 4, ["#FFFFFF", "#E32219"]),
  T("wolfsburg", "WOB", "VfL Wolfsburg", BL, "Německo", 4, ["#65B32E", "#FFFFFF"]),
  T("freiburg", "SCF", "SC Freiburg", BL, "Německo", 4, ["#000000", "#E60000"]),
  T("gladbach", "BMG", "Borussia Mönchengladbach", BL, "Německo", 3.5, ["#FFFFFF", "#000000"]),
  T("hoffenheim", "TSG", "TSG Hoffenheim", BL, "Německo", 3.5, ["#1961B5", "#FFFFFF"]),
  T("mainz", "M05", "Mainz 05", BL, "Německo", 3.5, ["#C3141E", "#FFFFFF"]),
  T("augsburg", "FCA", "FC Augsburg", BL, "Německo", 3.5, ["#BA3733", "#46714D"]),
  T("bremen", "SVW", "Werder Brémy", BL, "Německo", 3.5, ["#1D9053", "#FFFFFF"]),
  T("union-berlin", "FCU", "Union Berlín", BL, "Německo", 3.5, ["#EB1923", "#FFD500"]),
  T("koln", "KOE", "1. FC Kolín", BL, "Německo", 3.5, ["#ED1C24", "#FFFFFF"]),
  T("heidenheim", "HDH", "1. FC Heidenheim", BL, "Německo", 3, ["#003C7E", "#E30613"]),
  T("st-pauli", "STP", "FC St. Pauli", BL, "Německo", 3, ["#624737", "#FFFFFF"]),
  T("hamburg", "HSV", "Hamburger SV", BL, "Německo", 3.5, ["#0A3F86", "#FFFFFF"]),

  // ---------------- Ligue 1 (Francie) ----------------
  T("psg", "PSG", "Paris Saint-Germain", L1, "Francie", 5, ["#004170", "#DA291C"]),
  T("monaco", "ASM", "AS Monako", L1, "Francie", 4.5, ["#E51B22", "#FFFFFF"]),
  T("marseille", "OM", "Olympique Marseille", L1, "Francie", 4.5, ["#2FAEE0", "#FFFFFF"]),
  T("lille", "LOSC", "Lille OSC", L1, "Francie", 4, ["#E01E13", "#12285E"]),
  T("lyon", "OL", "Olympique Lyon", L1, "Francie", 4, ["#FFFFFF", "#DA0812"]),
  T("nice", "OGCN", "OGC Nice", L1, "Francie", 4, ["#000000", "#ED1C24"]),
  T("lens", "RCL", "RC Lens", L1, "Francie", 4, ["#FFD700", "#EC1C24"]),
  T("rennes", "SRFC", "Stade Rennais", L1, "Francie", 4, ["#E13327", "#000000"]),
  T("strasbourg", "RCS", "RC Štrasburk", L1, "Francie", 3.5, ["#009FE3", "#FFFFFF"]),
  T("toulouse", "TFC", "Toulouse FC", L1, "Francie", 3.5, ["#4B2E83", "#FFFFFF"]),
  T("nantes", "FCN", "FC Nantes", L1, "Francie", 3.5, ["#FCD405", "#008E5A"]),
  T("brest", "SB29", "Stade Brestois", L1, "Francie", 3.5, ["#E30613", "#FFFFFF"]),
  T("auxerre", "AJA", "AJ Auxerre", L1, "Francie", 3, ["#FFFFFF", "#003D7C"]),
  T("angers", "SCO", "Angers SCO", L1, "Francie", 3, ["#000000", "#FFFFFF"]),
  T("le-havre", "HAC", "Le Havre AC", L1, "Francie", 3, ["#0053A0", "#79BDE8"]),
  T("metz", "FCM", "FC Méty", L1, "Francie", 3, ["#7C2332", "#FFFFFF"]),
  T("lorient", "FCL", "FC Lorient", L1, "Francie", 3, ["#F36F21", "#000000"]),
  T("paris-fc", "PFC", "Paris FC", L1, "Francie", 3, ["#00205B", "#FFFFFF"], { versions: span(26) }),

  // ---------------- Eredivisie (Nizozemsko) ----------------
  T("ajax", "AJX", "Ajax Amsterdam", ERE, "Nizozemsko", 4.5, ["#D2122E", "#FFFFFF"]),
  T("psv", "PSV", "PSV Eindhoven", ERE, "Nizozemsko", 4.5, ["#ED1C24", "#FFFFFF"]),
  T("feyenoord", "FEY", "Feyenoord", ERE, "Nizozemsko", 4.5, ["#E31E24", "#FFFFFF"]),
  T("az", "AZ", "AZ Alkmaar", ERE, "Nizozemsko", 4, ["#DD1E33", "#FFFFFF"]),
  T("twente", "TWE", "FC Twente", ERE, "Nizozemsko", 4, ["#E70011", "#FFFFFF"]),
  T("utrecht", "UTR", "FC Utrecht", ERE, "Nizozemsko", 3.5, ["#E30613", "#FFFFFF"]),
  T("sparta-r", "SPR", "Sparta Rotterdam", ERE, "Nizozemsko", 3, ["#E31E31", "#FFFFFF"]),
  T("heerenveen", "HEE", "SC Heerenveen", ERE, "Nizozemsko", 3, ["#004B93", "#FFFFFF"]),
  T("nec", "NEC", "NEC Nijmegen", ERE, "Nizozemsko", 3, ["#DA121A", "#046A38"]),
  T("go-ahead", "GAE", "Go Ahead Eagles", ERE, "Nizozemsko", 3, ["#E30613", "#FFD500"]),
  T("fortuna-s", "FOR", "Fortuna Sittard", ERE, "Nizozemsko", 3, ["#F9B233", "#00753F"]),
  T("zwolle", "PEC", "PEC Zwolle", ERE, "Nizozemsko", 3, ["#0072BC", "#FFFFFF"]),
  T("groningen", "GRO", "FC Groningen", ERE, "Nizozemsko", 3, ["#009845", "#FFFFFF"]),
  T("excelsior", "EXC", "Excelsior", ERE, "Nizozemsko", 2.5, ["#ED1C24", "#000000"]),
  T("heracles", "HER", "Heracles Almelo", ERE, "Nizozemsko", 3, ["#000000", "#FFFFFF"]),
  T("nac-breda", "NAC", "NAC Breda", ERE, "Nizozemsko", 3, ["#FFE600", "#000000"]),
  T("volendam", "VOL", "FC Volendam", ERE, "Nizozemsko", 2.5, ["#F58220", "#000000"]),
  T("telstar", "TEL", "Telstar", ERE, "Nizozemsko", 2.5, ["#FFFFFF", "#000000"], { versions: span(26) }),

  // ---------------- Liga Portugal (Portugalsko) ----------------
  T("benfica", "SLB", "Benfica Lisabon", LP, "Portugalsko", 4.5, ["#E83030", "#FFFFFF"]),
  T("porto", "FCP", "FC Porto", LP, "Portugalsko", 4.5, ["#003E7E", "#FFFFFF"]),
  T("sporting", "SCP", "Sporting CP", LP, "Portugalsko", 4.5, ["#008057", "#FFFFFF"]),
  T("braga", "SCB", "SC Braga", LP, "Portugalsko", 4, ["#E30613", "#FFFFFF"]),
  T("guimaraes", "VSC", "Vitória Guimarães", LP, "Portugalsko", 3.5, ["#FFFFFF", "#000000"]),
  T("famalicao", "FAM", "FC Famalicão", LP, "Portugalsko", 3, ["#0053A0", "#FFFFFF"], { versions: span(20) }),
  T("moreirense", "MOR", "Moreirense FC", LP, "Portugalsko", 3, ["#00703C", "#FFFFFF"]),
  T("rio-ave", "RAV", "Rio Ave FC", LP, "Portugalsko", 3, ["#00843D", "#FFFFFF"]),
  T("casa-pia", "CPA", "Casa Pia AC", LP, "Portugalsko", 2.5, ["#000000", "#FFFFFF"], { versions: span(23) }),
  T("estoril", "EST", "GD Estoril Praia", LP, "Portugalsko", 3, ["#FFD700", "#0053A0"]),
  T("gil-vicente", "GVFC", "Gil Vicente FC", LP, "Portugalsko", 3, ["#C8102E", "#FFFFFF"]),
  T("arouca", "ARO", "FC Arouca", LP, "Portugalsko", 3, ["#FFD100", "#0033A0"]),
  T("santa-clara", "SCL", "CD Santa Clara", LP, "Portugalsko", 3, ["#E30613", "#FFFFFF"]),
  T("nacional", "NAM", "CD Nacional", LP, "Portugalsko", 2.5, ["#000000", "#FFFFFF"]),
  T("estrela", "EAM", "Estrela da Amadora", LP, "Portugalsko", 2.5, ["#E30613", "#00843D"], { versions: span(24) }),
  T("avs", "AVS", "AVS Futebol", LP, "Portugalsko", 2.5, ["#E30613", "#FFFFFF"], { versions: span(25) }),
  T("alverca", "ALV", "FC Alverca", LP, "Portugalsko", 2.5, ["#E30613", "#FFD100"], { versions: span(26) }),
  T("tondela", "TON", "CD Tondela", LP, "Portugalsko", 2.5, ["#FFD100", "#00843D"]),

  // ---------------- Süper Lig (Turecko) ----------------
  T("galatasaray", "GS", "Galatasaray", TSL, "Turecko", 4.5, ["#FDB912", "#A32638"]),
  T("fenerbahce", "FB", "Fenerbahçe", TSL, "Turecko", 4.5, ["#FFED00", "#00205B"]),
  T("besiktas", "BJK", "Beşiktaş", TSL, "Turecko", 4, ["#000000", "#FFFFFF"]),
  T("trabzonspor", "TS", "Trabzonspor", TSL, "Turecko", 4, ["#7B1C2C", "#5CB8E6"]),
  T("basaksehir", "IBFK", "Başakşehir", TSL, "Turecko", 3.5, ["#F26522", "#00205B"]),
  T("samsunspor", "SAM", "Samsunspor", TSL, "Turecko", 3, ["#E30613", "#FFFFFF"], { versions: span(24) }),
  T("alanyaspor", "ALN", "Alanyaspor", TSL, "Turecko", 3, ["#F58220", "#00843D"]),
  T("konyaspor", "KON", "Konyaspor", TSL, "Turecko", 3, ["#00843D", "#FFFFFF"]),
  T("antalyaspor", "ANT", "Antalyaspor", TSL, "Turecko", 3, ["#E30613", "#FFFFFF"]),
  T("kasimpasa", "KAS", "Kasımpaşa", TSL, "Turecko", 3, ["#00205B", "#FFFFFF"]),
  T("gaziantep", "GAZ", "Gaziantep FK", TSL, "Turecko", 3, ["#E30613", "#000000"], { versions: span(20) }),
  T("rizespor", "RIZ", "Çaykur Rizespor", TSL, "Turecko", 3, ["#00843D", "#0033A0"]),
  T("kayserispor", "KAY", "Kayserispor", TSL, "Turecko", 3, ["#FFD100", "#E30613"]),
  T("goztepe", "GOZ", "Göztepe", TSL, "Turecko", 3, ["#FFD100", "#E30613"], { versions: span(22) }),
  T("eyupspor", "EYU", "Eyüpspor", TSL, "Turecko", 3, ["#5CB8E6", "#FFD100"], { versions: span(25) }),
  T("karagumruk", "KGM", "Fatih Karagümrük", TSL, "Turecko", 3, ["#E30613", "#000000"], { versions: span(21) }),
  T("kocaelispor", "KOC", "Kocaelispor", TSL, "Turecko", 2.5, ["#00843D", "#000000"], { versions: span(26) }),
  T("genclerbirligi", "GB", "Gençlerbirliği", TSL, "Turecko", 2.5, ["#E30613", "#000000"]),

  // ---------------- Saudi Pro League (FC 24+) ----------------
  T("al-nassr", "NSR", "Al-Nassr", SPL, "Saúdská Arábie", 4.5, ["#FFD100", "#00205B"], { versions: span(24) }),
  T("al-hilal", "HIL", "Al-Hilal", SPL, "Saúdská Arábie", 4.5, ["#0033A0", "#FFFFFF"], { versions: span(24) }),
  T("al-ittihad", "ITT", "Al-Ittihad", SPL, "Saúdská Arábie", 4.5, ["#FFD100", "#000000"], { versions: span(24) }),
  T("al-ahli", "AHL", "Al-Ahli", SPL, "Saúdská Arábie", 4.5, ["#00843D", "#FFFFFF"], { versions: span(24) }),
  T("al-shabab", "SHB", "Al-Shabab", SPL, "Saúdská Arábie", 3.5, ["#FFFFFF", "#000000"], { versions: span(24) }),
  T("al-ettifaq", "ETT", "Al-Ettifaq", SPL, "Saúdská Arábie", 3.5, ["#00843D", "#E30613"], { versions: span(24) }),
  T("al-taawoun", "TAA", "Al-Taawoun", SPL, "Saúdská Arábie", 3.5, ["#FFD100", "#0033A0"], { versions: span(24) }),
  T("al-qadsiah", "QAD", "Al-Qadsiah", SPL, "Saúdská Arábie", 3.5, ["#FFD100", "#000000"], { versions: span(25) }),
  T("al-fateh", "FAT", "Al-Fateh", SPL, "Saúdská Arábie", 3, ["#00205B", "#FFFFFF"], { versions: span(24) }),
  T("al-fayha", "FAY", "Al-Fayha", SPL, "Saúdská Arábie", 3, ["#F58220", "#00205B"], { versions: span(24) }),
  T("al-riyadh", "RYD", "Al-Riyadh", SPL, "Saúdská Arábie", 3, ["#FFD100", "#00205B"], { versions: span(24) }),
  T("al-khaleej", "KHA", "Al-Khaleej", SPL, "Saúdská Arábie", 3, ["#E30613", "#FFFFFF"], { versions: span(24) }),
  T("damac", "DAM", "Damac FC", SPL, "Saúdská Arábie", 3, ["#7B1C2C", "#FFFFFF"], { versions: span(24) }),
  T("al-wehda", "WEH", "Al-Wehda", SPL, "Saúdská Arábie", 3, ["#E30613", "#FFFFFF"], { versions: span(24) }),
  T("al-raed", "RAE", "Al-Raed", SPL, "Saúdská Arábie", 2.5, ["#0033A0", "#FFD100"], { versions: span(24) }),
  T("al-okhdood", "OKH", "Al-Okhdood", SPL, "Saúdská Arábie", 2.5, ["#00843D", "#FFFFFF"], { versions: span(24) }),
  T("al-hazem", "HAZ", "Al-Hazem", SPL, "Saúdská Arábie", 2.5, ["#E30613", "#FFD100"], { versions: span(24) }),
  T("al-kholood", "KHO", "Al-Kholood", SPL, "Saúdská Arábie", 2.5, ["#7B1C2C", "#FFD100"], { versions: span(26) }),

  // ---------------- MLS (USA / Kanada) ----------------
  T("inter-miami", "MIA", "Inter Miami CF", MLS, "USA", 4, ["#F7B5CD", "#231F20"], { versions: span(21) }),
  T("lafc", "LAFC", "Los Angeles FC", MLS, "USA", 4, ["#000000", "#C39E6D"], { versions: span(19) }),
  T("la-galaxy", "LAG", "LA Galaxy", MLS, "USA", 4, ["#00245D", "#FFD200"]),
  T("atlanta-utd", "ATL", "Atlanta United", MLS, "USA", 3.5, ["#80000B", "#A19060"], { versions: span(18) }),
  T("seattle", "SEA", "Seattle Sounders", MLS, "USA", 3.5, ["#5D9741", "#005595"]),
  T("columbus", "CLB", "Columbus Crew", MLS, "USA", 3.5, ["#FEDD00", "#000000"]),
  T("cincinnati", "CIN", "FC Cincinnati", MLS, "USA", 3.5, ["#F05323", "#263B80"], { versions: span(20) }),
  T("philadelphia", "PHI", "Philadelphia Union", MLS, "USA", 3.5, ["#071B2C", "#B18500"]),
  T("orlando", "ORL", "Orlando City SC", MLS, "USA", 3.5, ["#633492", "#FDE192"]),
  T("ny-red-bulls", "RBNY", "New York Red Bulls", MLS, "USA", 3.5, ["#FFFFFF", "#ED1E36"]),
  T("nycfc", "NYC", "New York City FC", MLS, "USA", 3.5, ["#6CACE4", "#00285E"]),
  T("toronto", "TFC", "Toronto FC", MLS, "Kanada", 3, ["#B81137", "#455560"]),
  T("portland", "POR", "Portland Timbers", MLS, "USA", 3.5, ["#00482B", "#D69A00"]),
  T("austin", "ATX", "Austin FC", MLS, "USA", 3, ["#00B140", "#000000"], { versions: span(22) }),
  T("nashville", "NSH", "Nashville SC", MLS, "USA", 3, ["#ECE83A", "#1F1646"], { versions: span(21) }),
  T("charlotte", "CLT", "Charlotte FC", MLS, "USA", 3, ["#1A85C8", "#000000"], { versions: span(23) }),
  T("st-louis", "STL", "St. Louis City SC", MLS, "USA", 3, ["#DC052D", "#001544"], { versions: span(24) }),
  T("vancouver", "VAN", "Vancouver Whitecaps", MLS, "Kanada", 3.5, ["#00245E", "#9DC2EA"]),
  T("minnesota", "MIN", "Minnesota United", MLS, "USA", 3, ["#8CD2F4", "#231F20"], { versions: span(18) }),
  T("houston", "HOU", "Houston Dynamo", MLS, "USA", 3, ["#FF6B00", "#101820"]),
  T("chicago", "CHI", "Chicago Fire", MLS, "USA", 3, ["#141946", "#FF0000"]),
  T("dc-united", "DCU", "D.C. United", MLS, "USA", 3, ["#000000", "#EF3E42"]),
  T("salt-lake", "RSL", "Real Salt Lake", MLS, "USA", 3, ["#B30838", "#013A81"]),
  T("san-diego", "SD", "San Diego FC", MLS, "USA", 3.5, ["#0098C9", "#001B2E"], { versions: span(26) }),

  // ---------------- EFL Championship (Anglie, 2. liga) ----------------
  T("leicester", "LEI", "Leicester City", CH, "Anglie", 4, ["#003090", "#FDBE11"]),
  T("southampton", "SOU", "Southampton", CH, "Anglie", 4, ["#D71920", "#FFFFFF"]),
  T("west-brom", "WBA", "West Bromwich Albion", CH, "Anglie", 3.5, ["#122F67", "#FFFFFF"]),
  T("norwich", "NOR", "Norwich City", CH, "Anglie", 3.5, ["#FFF200", "#00A650"]),
  T("watford", "WAT", "Watford", CH, "Anglie", 3.5, ["#FBEE23", "#ED2127"]),
  T("middlesbrough", "MID", "Middlesbrough", CH, "Anglie", 3.5, ["#E11B22", "#FFFFFF"]),
  T("sheffield-utd", "SHU", "Sheffield United", CH, "Anglie", 3.5, ["#EE2737", "#FFFFFF"]),
  T("coventry", "COV", "Coventry City", CH, "Anglie", 3.5, ["#78D0F3", "#FFFFFF"]),
  T("ipswich", "IPS", "Ipswich Town", CH, "Anglie", 3.5, ["#0044A9", "#FFFFFF"]),
  T("bristol-city", "BRC", "Bristol City", CH, "Anglie", 3, ["#E21C38", "#FFFFFF"]),
  T("blackburn", "BLB", "Blackburn Rovers", CH, "Anglie", 3, ["#009EE0", "#FFFFFF"]),
  T("birmingham", "BIR", "Birmingham City", CH, "Anglie", 3, ["#0000FF", "#FFFFFF"]),
  T("hull", "HUL", "Hull City", CH, "Anglie", 3, ["#F5A12D", "#000000"]),
  T("derby", "DER", "Derby County", CH, "Anglie", 3, ["#FFFFFF", "#000000"]),
  T("preston", "PNE", "Preston North End", CH, "Anglie", 3, ["#FFFFFF", "#00205B"]),
  T("qpr", "QPR", "Queens Park Rangers", CH, "Anglie", 3, ["#005CAB", "#FFFFFF"]),
  T("millwall", "MLW", "Millwall", CH, "Anglie", 3, ["#001D5E", "#FFFFFF"]),
  T("sheffield-wed", "SHW", "Sheffield Wednesday", CH, "Anglie", 3, ["#0066B3", "#FFFFFF"]),
  T("stoke", "STK", "Stoke City", CH, "Anglie", 3, ["#E03A3E", "#FFFFFF"]),
  T("swansea", "SWA", "Swansea City", CH, "Anglie", 3, ["#FFFFFF", "#000000"]),
  T("portsmouth", "POM", "Portsmouth", CH, "Anglie", 3, ["#001489", "#FFFFFF"]),
  T("oxford", "OXF", "Oxford United", CH, "Anglie", 2.5, ["#FFF200", "#00205B"]),
  T("charlton", "CHA", "Charlton Athletic", CH, "Anglie", 3, ["#E31B23", "#FFFFFF"]),
  T("wrexham", "WRX", "Wrexham AFC", CH, "Wales", 3, ["#E31B23", "#FFFFFF"], { versions: span(24) }),

  // ---------------- Scottish Premiership (Skotsko) ----------------
  T("celtic", "CEL", "Celtic Glasgow", SCO, "Skotsko", 4, ["#018749", "#FFFFFF"]),
  T("rangers", "RAN", "Rangers FC", SCO, "Skotsko", 4, ["#0033A0", "#FFFFFF"]),
  T("hearts", "HEA", "Heart of Midlothian", SCO, "Skotsko", 3.5, ["#800910", "#FFFFFF"]),
  T("aberdeen", "ABE", "Aberdeen FC", SCO, "Skotsko", 3.5, ["#E20E0E", "#FFFFFF"]),
  T("hibernian", "HIB", "Hibernian", SCO, "Skotsko", 3.5, ["#006630", "#FFFFFF"]),
  T("dundee-utd", "DUN", "Dundee United", SCO, "Skotsko", 3, ["#F26522", "#000000"]),
  T("motherwell", "MOT", "Motherwell", SCO, "Skotsko", 3, ["#FBB910", "#7A263A"]),
  T("st-mirren", "STM", "St. Mirren", SCO, "Skotsko", 3, ["#000000", "#FFFFFF"]),
  T("kilmarnock", "KIL", "Kilmarnock", SCO, "Skotsko", 3, ["#0E4681", "#FFFFFF"]),
  T("dundee-fc", "DEE", "Dundee FC", SCO, "Skotsko", 3, ["#1A2F5C", "#FFFFFF"]),
  T("livingston", "LIV", "Livingston", SCO, "Skotsko", 2.5, ["#FFD100", "#000000"]),
  T("falkirk", "FAL", "Falkirk", SCO, "Skotsko", 2.5, ["#00205B", "#FFFFFF"], { versions: span(26) }),

  // ---------------- Reprezentace ----------------
  T("nt-argentina", "ARG", "Argentina", NT, "Argentina", 5, ["#75AADB", "#FFFFFF"], { national: true }),
  T("nt-francie", "FRA", "Francie", NT, "Francie", 5, ["#21304D", "#EF4135"], { national: true }),
  T("nt-anglie", "ENG", "Anglie", NT, "Anglie", 5, ["#FFFFFF", "#CE1124"], { national: true }),
  T("nt-spanelsko", "ESP", "Španělsko", NT, "Španělsko", 5, ["#AA151B", "#F1BF00"], { national: true }),
  T("nt-portugalsko", "POR", "Portugalsko", NT, "Portugalsko", 5, ["#046A38", "#DA291C"], { national: true }),
  T("nt-brazilie", "BRA", "Brazílie", NT, "Brazílie", 5, ["#FFDF00", "#009C3B"], { national: true, versions: span(17, 23) }),
  T("nt-nemecko", "GER", "Německo", NT, "Německo", 4.5, ["#FFFFFF", "#000000"], { national: true }),
  T("nt-nizozemsko", "NED", "Nizozemsko", NT, "Nizozemsko", 4.5, ["#F36C21", "#FFFFFF"], { national: true }),
  T("nt-italie", "ITA", "Itálie", NT, "Itálie", 4.5, ["#0066B2", "#FFFFFF"], { national: true }),
  T("nt-belgie", "BEL", "Belgie", NT, "Belgie", 4.5, ["#ED2939", "#000000"], { national: true }),
  T("nt-uruguay", "URU", "Uruguay", NT, "Uruguay", 4, ["#7BAFD4", "#FFFFFF"], { national: true }),
  T("nt-kolumbie", "COL", "Kolumbie", NT, "Kolumbie", 4, ["#FCD116", "#003893"], { national: true }),
  T("nt-maroko", "MAR", "Maroko", NT, "Maroko", 4, ["#C1272D", "#006233"], { national: true, versions: span(23) }),
  T("nt-svycarsko", "SUI", "Švýcarsko", NT, "Švýcarsko", 4, ["#DA291C", "#FFFFFF"], { national: true }),
  T("nt-dansko", "DEN", "Dánsko", NT, "Dánsko", 4, ["#C8102E", "#FFFFFF"], { national: true }),
  T("nt-polsko", "POL", "Polsko", NT, "Polsko", 4, ["#FFFFFF", "#DC143C"], { national: true }),
  T("nt-usa", "USA", "USA", NT, "USA", 4, ["#002868", "#BF0A30"], { national: true }),
  T("nt-mexiko", "MEX", "Mexiko", NT, "Mexiko", 4, ["#006847", "#CE1126"], { national: true }),
  T("nt-norsko", "NOR", "Norsko", NT, "Norsko", 4, ["#BA0C2F", "#00205B"], { national: true }),
  T("nt-rakousko", "AUT", "Rakousko", NT, "Rakousko", 4, ["#ED2939", "#FFFFFF"], { national: true }),
  T("nt-senegal", "SEN", "Senegal", NT, "Senegal", 4, ["#00853F", "#FDEF42"], { national: true, versions: span(23) }),
  T("nt-cesko", "CZE", "Česko", NT, "Česko", 3.5, ["#D7141A", "#11457E"], { national: true }),
  T("nt-svedsko", "SWE", "Švédsko", NT, "Švédsko", 3.5, ["#FECC02", "#006AA7"], { national: true }),
  T("nt-wales", "WAL", "Wales", NT, "Wales", 3.5, ["#C8102E", "#00B140"], { national: true }),
  T("nt-skotsko", "SCO", "Skotsko", NT, "Skotsko", 3.5, ["#0065BF", "#FFFFFF"], { national: true }),
  T("nt-madarsko", "HUN", "Maďarsko", NT, "Maďarsko", 3.5, ["#CE2939", "#477050"], { national: true }),
  T("nt-rumunsko", "ROU", "Rumunsko", NT, "Rumunsko", 3.5, ["#FCD116", "#002B7F"], { national: true }),
  T("nt-ekvador", "ECU", "Ekvádor", NT, "Ekvádor", 3.5, ["#FFDD00", "#034EA2"], { national: true }),
  T("nt-chile", "CHI", "Chile", NT, "Chile", 3.5, ["#D52B1E", "#0039A6"], { national: true }),
  T("nt-kanada", "CAN", "Kanada", NT, "Kanada", 3.5, ["#FF0000", "#FFFFFF"], { national: true, versions: span(23) }),
  T("nt-australie", "AUS", "Austrálie", NT, "Austrálie", 3.5, ["#FFCD00", "#00843D"], { national: true }),
  T("nt-kamerun", "CMR", "Kamerun", NT, "Kamerun", 3.5, ["#007A5E", "#CE1126"], { national: true, versions: span(23) }),
  T("nt-ghana", "GHA", "Ghana", NT, "Ghana", 3.5, ["#CE1126", "#FCD116"], { national: true, versions: span(23) }),
  T("nt-irsko", "IRL", "Irsko", NT, "Irsko", 3, ["#169B62", "#FFFFFF"], { national: true }),
  T("nt-sev-irsko", "NIR", "Severní Irsko", NT, "Severní Irsko", 3, ["#00843D", "#FFFFFF"], { national: true }),
  T("nt-island", "ISL", "Island", NT, "Island", 3, ["#02529C", "#DC1E35"], { national: true }),
  T("nt-finsko", "FIN", "Finsko", NT, "Finsko", 3, ["#FFFFFF", "#002F6C"], { national: true }),
  T("nt-peru", "PER", "Peru", NT, "Peru", 3, ["#D91023", "#FFFFFF"], { national: true }),
  T("nt-paraguay", "PAR", "Paraguay", NT, "Paraguay", 3, ["#D52B1E", "#0038A8"], { national: true }),
  T("nt-venezuela", "VEN", "Venezuela", NT, "Venezuela", 3, ["#7B0000", "#FCD116"], { national: true }),
  T("nt-katar", "QAT", "Katar", NT, "Katar", 3, ["#8D1B3D", "#FFFFFF"], { national: true, versions: span(22) }),
  T("nt-saudska", "KSA", "Saúdská Arábie", NT, "Saúdská Arábie", 3, ["#006C35", "#FFFFFF"], { national: true }),
  T("nt-tunisko", "TUN", "Tunisko", NT, "Tunisko", 3, ["#E70013", "#FFFFFF"], { national: true, versions: span(23) }),
  T("nt-cina", "CHN", "Čína", NT, "Čína", 2.5, ["#DE2910", "#FFDE00"], { national: true }),
  T("nt-novy-zeland", "NZL", "Nový Zéland", NT, "Nový Zéland", 2.5, ["#000000", "#FFFFFF"], { national: true }),
  T("nt-bolivie", "BOL", "Bolívie", NT, "Bolívie", 2.5, ["#007934", "#D52B1E"], { national: true }),
  T("nt-bulharsko", "BUL", "Bulharsko", NT, "Bulharsko", 2.5, ["#FFFFFF", "#00966E"], { national: true }),
];

export const TEAMS_BY_ID: Map<string, Team> = new Map(TEAMS.map((t) => [t.id, t]));

export function teamName(team: Team, versions: GameVersion[]): string {
  // When several versions are pooled, show the override of the newest one.
  for (let i = versions.length - 1; i >= 0; i--) {
    const o = team.nameOverrides?.[versions[i]];
    if (o) return o;
  }
  return team.name;
}

export function teamStars(team: Team, versions: GameVersion[]): number {
  for (let i = versions.length - 1; i >= 0; i--) {
    const o = team.starOverrides?.[versions[i]];
    if (o !== undefined) return o;
  }
  return team.stars;
}

export function teamsForVersions(versions: GameVersion[], includeNational: boolean): Team[] {
  return TEAMS.filter(
    (t) =>
      (includeNational || !t.national) && t.versions.some((v) => versions.includes(v)),
  );
}

export const LEAGUES: string[] = [...new Set(TEAMS.map((t) => t.league))];
