import type { EpisodeRange, TorrentResourceAnalysis } from "./types.js";

const KNOWN_RELEASE_GROUPS = [
  "ALT",
  "BATWEB",
  "BlackTV",
  "CatWEB",
  "ColorTV",
  "ColorWEB",
  "CTRLHD",
  "CTRLTV",
  "DeePTV",
  "DEFiNiTE",
  "DreamHD",
  "FGT",
  "GPTHD",
  "IAMABLE",
  "MiniHD",
  "MiniTV",
  "MOMOWEB",
  "PandaQT",
  "ParkHD",
  "ParkTV",
  "QuickIO",
  "RARBG",
  "SONYHD",
  "SSDSSE",
  "TERMiNAL",
  "WiKi",
  "ZeroTV",
];

const WEB_PROVIDER_ALIASES = new Map([
  ["apple.tv+", "ATVP"],
  ["atvp", "ATVP"],
  ["amzn", "AMZN"],
  ["baha", "Baha"],
  ["catchplay+", "CATCHPLAY+"],
  ["catchplay", "CATCHPLAY+"],
  ["cr", "CR"],
  ["dsnp", "DSNP"],
  ["hamivideo", "HamiVideo"],
  ["hulu", "Hulu"],
  ["iq", "IQ"],
  ["it", "iTunes"],
  ["itunes", "iTunes"],
  ["kktv", "KKTV"],
  ["max", "MAX"],
  ["myvideo", "MyVideo"],
  ["nf", "NF"],
  ["nowplayer", "NowPlayer"],
  ["stan", "Stan"],
  ["viu", "Viu"],
]);

function appendUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function hasDelimitedToken(title: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[.\\s\\[+])${escaped}(?=$|[.\\s\\]+-])`, "i").test(
    title,
  );
}

function isEmptyAnalysis(analysis: TorrentResourceAnalysis): boolean {
  return Object.keys(analysis).length === 0;
}

function assignIfDefined<K extends keyof TorrentResourceAnalysis>(
  analysis: TorrentResourceAnalysis,
  key: K,
  value: TorrentResourceAnalysis[K] | undefined,
): void {
  if (value !== undefined) {
    analysis[key] = value;
  }
}

function removeBracketedText(title: string) {
  return title.replace(/\[[^\]]*]/g, " ");
}

function detectResolution(title: string) {
  const match = /(?:^|[.\s\[])(2160p|1080p|720p|480p)(?=$|[.\s\]\-])/i.exec(
    title,
  );
  return match?.[1].toLowerCase();
}

function detectSource(title: string) {
  const hasBluRay = /blu-?ray/i.test(title);
  const hasRemux = /remux/i.test(title);
  const hasUhd = hasDelimitedToken(title, "UHD");

  if (hasBluRay && hasRemux && hasUhd) return "UHD BluRay REMUX";
  if (hasBluRay && hasRemux) return "BluRay REMUX";
  if (hasBluRay && hasUhd) return "UHD BluRay";
  if (hasBluRay) return "BluRay";
  if (/web-?dl/i.test(title)) return "WEB-DL";
  if (/webrip/i.test(title)) return "WEBRip";

  return undefined;
}

function detectWebProvider(title: string) {
  const normalizedEntries = Array.from(WEB_PROVIDER_ALIASES.entries()).sort(
    ([left], [right]) => right.length - left.length,
  );

  for (const [rawProvider, provider] of normalizedEntries) {
    if (hasDelimitedToken(title, rawProvider)) {
      return provider;
    }
  }

  return undefined;
}

function detectVideoCodec(title: string) {
  if (/(?:^|[.\s])(x265|h\.?265|hevc)(?=$|[.\s\-])/i.test(title)) {
    return "H.265/HEVC";
  }

  if (/(?:^|[.\s])(x264|h\.?264|avc)(?=$|[.\s\-])/i.test(title)) {
    return "H.264/AVC";
  }

  if (hasDelimitedToken(title, "AV1")) {
    return "AV1";
  }

  return undefined;
}

function detectReleaseGroup(title: string) {
  const knownGroup = KNOWN_RELEASE_GROUPS.find((group) =>
    new RegExp(`-${group}$`, "i").test(title),
  );
  if (knownGroup) return knownGroup;

  const match = /-([A-Za-z][A-Za-z0-9]{1,19})$/.exec(title);
  return match?.[1];
}

function detectSeason(title: string) {
  const seasonToken = /(?:^|[.\s\[])[Ss](\d{1,2})(?=$|[.\s\]\-])/.exec(title);
  if (seasonToken) {
    return Number(seasonToken[1]);
  }

  return undefined;
}

function detectEpisodeRange(title: string): EpisodeRange | undefined {
  const rangeMatch = /第(\d{1,3})-(\d{1,3})集/.exec(title);
  if (rangeMatch) {
    return {
      start: Number(rangeMatch[1]),
      end: Number(rangeMatch[2]),
    };
  }

  const singleEpisodeMatch = /第(\d{1,3})集/.exec(title);
  if (singleEpisodeMatch) {
    const episode = Number(singleEpisodeMatch[1]);
    return { start: episode, end: episode };
  }

  const completeMatch = /全(\d{1,3})集/.exec(title);
  if (completeMatch) {
    return {
      start: 1,
      end: Number(completeMatch[1]),
    };
  }

  return undefined;
}

function detectIsCompleteSeason(title: string) {
  return /全集|全\d{1,3}集/.test(title) ? true : undefined;
}

function detectFrameRateFromText(title: string) {
  const match = /(?:^|[.\s\[])(50|60|120)(?:fps|帧率版本)(?=$|[.\s\]\-])/i.exec(
    title,
  );
  return match ? Number(match[1]) : undefined;
}

function detectFrameRate(title: string) {
  return detectFrameRateFromText(removeBracketedText(title)) ?? detectFrameRateFromText(title);
}

function detectIsHighBitrate(title: string) {
  return /高码版/.test(title) || hasDelimitedToken(title, "HQ") ? true : undefined;
}

function detectHdrFormatsFromText(title: string) {
  const hdrFormats: string[] = [];

  if (/杜比视界|DoVi|(?:^|[.\[])(DV)(?=$|[.\]\-])/i.test(title)) {
    appendUnique(hdrFormats, "Dolby Vision");
  }

  if (/HDR10\+|HDR10plus/i.test(title)) {
    appendUnique(hdrFormats, "HDR10+");
  }

  if (hasDelimitedToken(title, "HDR10") && !/HDR10\+|HDR10plus/i.test(title)) {
    appendUnique(hdrFormats, "HDR10");
  }

  if (hasDelimitedToken(title, "HDR")) {
    appendUnique(hdrFormats, "HDR");
  }

  return hdrFormats.length > 0 ? hdrFormats : undefined;
}

function detectHdrFormats(title: string) {
  return detectHdrFormatsFromText(removeBracketedText(title)) ?? detectHdrFormatsFromText(title);
}

function detectAudioFormats(title: string) {
  const audioFormats: string[] = [];

  if (/DTS[-.]?HD|DTS-HDMA/i.test(title)) appendUnique(audioFormats, "DTS-HD");
  if (/(?:^|[.\s])DTS(?![-.]?HD|HDMA)(?=$|[.\s\d\-])/i.test(title)) {
    appendUnique(audioFormats, "DTS");
  }
  if (/TrueHD/i.test(title)) appendUnique(audioFormats, "TrueHD");
  if (/Atmos/i.test(title)) appendUnique(audioFormats, "Atmos");
  if (/(?:^|[.\s])(?:DDP|E-AC-?3)(?=$|[.\s\d\-])/i.test(title)) {
    appendUnique(audioFormats, "DDP");
  }
  if (/(?:^|[.\s])DD(?=$|[.\s\d\-])/i.test(title)) {
    appendUnique(audioFormats, "DD");
  }
  if (/(?:^|[.\s])AAC(?=$|[.\s\d\-])/i.test(title)) {
    appendUnique(audioFormats, "AAC");
  }
  if (/(?:^|[.\s])FLAC(?=$|[.\s\d\-])/i.test(title)) {
    appendUnique(audioFormats, "FLAC");
  }

  return audioFormats.length > 0 ? audioFormats : undefined;
}

function detectSubtitleLanguages(title: string) {
  if (/无字片源/.test(title)) return ["none"];

  const subtitleLanguages: string[] = [];

  if (/简繁英.*字幕/.test(title)) {
    appendUnique(subtitleLanguages, "zh-Hans");
    appendUnique(subtitleLanguages, "zh-Hant");
    appendUnique(subtitleLanguages, "en");
  } else if (/繁英.*字幕/.test(title)) {
    appendUnique(subtitleLanguages, "zh-Hant");
    appendUnique(subtitleLanguages, "en");
  } else if (/简繁.*字幕/.test(title)) {
    appendUnique(subtitleLanguages, "zh-Hans");
    appendUnique(subtitleLanguages, "zh-Hant");
  } else {
    if (/简中/.test(title)) appendUnique(subtitleLanguages, "zh-Hans");
    if (/繁中|繁体字幕/.test(title)) appendUnique(subtitleLanguages, "zh-Hant");
    if (/英字|英文字幕/.test(title)) appendUnique(subtitleLanguages, "en");
    if (/中文字幕|中字/.test(title)) appendUnique(subtitleLanguages, "zh");
  }

  return subtitleLanguages.length > 0 ? subtitleLanguages : undefined;
}

export function analyzeTorrentResourceTitle(
  title: string,
): TorrentResourceAnalysis | undefined {
  const analysis: TorrentResourceAnalysis = {};

  assignIfDefined(analysis, "resolution", detectResolution(title));
  assignIfDefined(analysis, "source", detectSource(title));
  assignIfDefined(analysis, "webProvider", detectWebProvider(title));
  assignIfDefined(analysis, "videoCodec", detectVideoCodec(title));
  assignIfDefined(analysis, "releaseGroup", detectReleaseGroup(title));
  assignIfDefined(analysis, "season", detectSeason(title));
  assignIfDefined(analysis, "episodeRange", detectEpisodeRange(title));
  assignIfDefined(analysis, "isCompleteSeason", detectIsCompleteSeason(title));
  assignIfDefined(analysis, "frameRate", detectFrameRate(title));
  assignIfDefined(analysis, "isHighBitrate", detectIsHighBitrate(title));
  assignIfDefined(analysis, "hdrFormats", detectHdrFormats(title));
  assignIfDefined(analysis, "audioFormats", detectAudioFormats(title));
  assignIfDefined(
    analysis,
    "subtitleLanguages",
    detectSubtitleLanguages(title),
  );

  return isEmptyAnalysis(analysis) ? undefined : analysis;
}
