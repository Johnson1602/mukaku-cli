import { describe, expect, it } from "vitest";
import { analyzeTorrentResourceTitle } from "./resource-analysis.js";

describe("analyzeTorrentResourceTitle", () => {
  it("detects WEB-DL movie resource signals", () => {
    const result = analyzeTorrentResourceTitle(
      "泰勒·斯威夫特：时代巡回演唱会终场秀[简繁英字幕].2025.2160p.DSNP.WEB-DL.H265.HDR.DDP5.1.Atmos-QuickIO",
    );

    expect(result).toEqual({
      resolution: "2160p",
      source: "WEB-DL",
      webProvider: "DSNP",
      videoCodec: "H.265/HEVC",
      releaseGroup: "QuickIO",
      hdrFormats: ["HDR"],
      audioFormats: ["Atmos", "DDP"],
      subtitleLanguages: ["zh-Hans", "zh-Hant", "en"],
    });
  });

  it("uses the most specific source phrase for UHD BluRay remuxes", () => {
    const result = analyzeTorrentResourceTitle(
      "至尊马蒂[HDR+杜比视界双版本][简繁英字幕].2025.USA.A24.BluRay.REMUX.UHD.DoVi.HDR10.2160p.Atmos.TrueHD7.1-DreamHD",
    );

    expect(result).toEqual({
      resolution: "2160p",
      source: "UHD BluRay REMUX",
      releaseGroup: "DreamHD",
      hdrFormats: ["Dolby Vision", "HDR10", "HDR"],
      audioFormats: ["TrueHD", "Atmos"],
      subtitleLanguages: ["zh-Hans", "zh-Hant", "en"],
    });
  });

  it("detects complete TV season coverage", () => {
    const result = analyzeTorrentResourceTitle(
      "全集 安多.第二季[HDR+杜比视界双版本][全12集][简繁英字幕].2025.2160p.DSNP.WEB-DL.DDP5.1.Atmos.H265.HDR.DV-MiniTV",
    );

    expect(result).toEqual({
      resolution: "2160p",
      source: "WEB-DL",
      webProvider: "DSNP",
      videoCodec: "H.265/HEVC",
      releaseGroup: "MiniTV",
      episodeRange: {
        start: 1,
        end: 12,
      },
      isCompleteSeason: true,
      hdrFormats: ["Dolby Vision", "HDR"],
      audioFormats: ["Atmos", "DDP"],
      subtitleLanguages: ["zh-Hans", "zh-Hant", "en"],
    });
  });

  it("detects partial episode ranges without marking them complete", () => {
    const result = analyzeTorrentResourceTitle(
      "匹兹堡医护前线[第01-02集][简繁英字幕].The.Pitt.S01.2025.2160p.Max.WEB-DL.DDP5.1.H265-ZeroTV",
    );

    expect(result).toEqual({
      resolution: "2160p",
      source: "WEB-DL",
      webProvider: "MAX",
      videoCodec: "H.265/HEVC",
      releaseGroup: "ZeroTV",
      season: 1,
      episodeRange: {
        start: 1,
        end: 2,
      },
      audioFormats: ["DDP"],
      subtitleLanguages: ["zh-Hans", "zh-Hant", "en"],
    });
  });

  it("omits unknown web providers", () => {
    const result = analyzeTorrentResourceTitle(
      "后来的我们[中文字幕].Once.We.Were.Us.2026.1080p.FutureStream.WEB-DL.AAC2.0.H.264-DreamHD",
    );

    expect(result).toMatchObject({
      source: "WEB-DL",
    });
    expect(result?.webProvider).toBeUndefined();
  });

  it("only detects seasons from Sxx release tokens", () => {
    const result = analyzeTorrentResourceTitle(
      "全集 彩排 第二季[全6集][简繁英字幕].The.Rehearsal.2025.1080p.NF.WEB-DL.DDP5.1.H264-ColorTV",
    );

    expect(result).toMatchObject({
      source: "WEB-DL",
      webProvider: "NF",
      isCompleteSeason: true,
      episodeRange: {
        start: 1,
        end: 6,
      },
    });
    expect(result?.season).toBeUndefined();
  });

  it("detects high frame rate and high bitrate markers", () => {
    const result = analyzeTorrentResourceTitle(
      "南京照相馆[60帧率版本][高码版][国语配音+中文字幕].2025.2160p.HQ.WEB-DL.H265.HDR.60fps.DTS5.1-DreamHD",
    );

    expect(result).toEqual({
      resolution: "2160p",
      source: "WEB-DL",
      videoCodec: "H.265/HEVC",
      releaseGroup: "DreamHD",
      frameRate: 60,
      isHighBitrate: true,
      hdrFormats: ["HDR"],
      audioFormats: ["DTS"],
      subtitleLanguages: ["zh"],
    });
  });

  it("represents no-subtitle resources as subtitleLanguages none", () => {
    const result = analyzeTorrentResourceTitle(
      "冥婚红包[无字片源].The.Red.Envelope.2025.1080p.NF.WEB-DL.x264.DDP5.1-QuickIO",
    );

    expect(result).toEqual({
      resolution: "1080p",
      source: "WEB-DL",
      webProvider: "NF",
      videoCodec: "H.264/AVC",
      releaseGroup: "QuickIO",
      audioFormats: ["DDP"],
      subtitleLanguages: ["none"],
    });
  });

  it("omits analysis when no high-confidence fields are detected", () => {
    expect(analyzeTorrentResourceTitle("WEB newer")).toBeUndefined();
  });
});
