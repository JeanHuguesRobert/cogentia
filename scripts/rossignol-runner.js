#!/usr/bin/env node
/**
 * Rossignol Minimal 24h Intelligence Watch Runner (CLI).
 *
 * Implements GitHub Issue #141 (Parent #140, Context #139, Convergence #123, Sleep Cycle #124)
 * with dedicated territorial focus on Corsican public data for the Senate Campaign 2026.
 *
 * Usage:
 *   node scripts/rossignol-runner.js --smoke
 *   node scripts/rossignol-runner.js --watch=corsica --model-class=strong
 *   node scripts/rossignol-runner.js --mode=run --duration=24h
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_WATCH_FEEDS,
  triageAndDeduplicate,
  encapsulateEventToPacket,
  exploreEventIndependentBranches,
  buildConvergenceCheckpoint,
  runRossignolSleepCycle,
  createWorkloadMeasurementLog,
  project90DayEnvelopes
} from "./lib/rossignol-watch.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, ".cogentia", "rossignol");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    smoke: false,
    watch: "all", // "corsica", "ai", "all"
    modelClass: "medium", // "small", "medium", "strong", "strongest_available"
    outputDir: outputDir,
    json: false
  };

  for (const arg of args) {
    if (arg === "--smoke" || arg === "--mode=smoke") options.smoke = true;
    else if (arg.startsWith("--watch=")) options.watch = arg.split("=")[1];
    else if (arg.startsWith("--model-class=")) options.modelClass = arg.split("=")[1];
    else if (arg.startsWith("--output-dir=")) options.outputDir = path.resolve(arg.split("=")[1]);
    else if (arg === "--json") options.json = true;
  }

  return options;
}

export async function runRossignolPipeline(options = {}) {
  const startedAt = Date.now();
  if (!fs.existsSync(options.outputDir || outputDir)) {
    fs.mkdirSync(options.outputDir || outputDir, { recursive: true });
  }

  console.log("==========================================================================");
  console.log(" 🦅 ROSSIGNOL — Minimal COP-Native 24h Intelligence Watch Runner (R1)");
  console.log("    Focus: Veille Territoriale Corse (Sénatoriales 2026) & Veille IA");
  console.log(`    Mode: ${options.smoke ? "SMOKE TEST (Validation d'Invariants)" : "LIVE RUN"} | Classe Modèle: ${options.modelClass || "medium"}`);
  console.log("==========================================================================\n");

  const streamsToRun = [];
  if (options.watch === "corsica" || options.watch === "all") streamsToRun.push("corsica");
  if (options.watch === "ai" || options.watch === "all") streamsToRun.push("ai");

  const allPackets = [];
  const allConvergences = [];
  const allWorkloadLogs = [];
  const streamStats = {};

  for (const streamName of streamsToRun) {
    const rawItems = DEFAULT_WATCH_FEEDS[streamName] || [];
    console.log(`📡 [Flux : ${streamName.toUpperCase()}] Ingestion de ${rawItems.length} sources publiques primaires...`);

    // 1. Triage & Déduplication
    const { candidates, duplicatesCount } = triageAndDeduplicate(rawItems);
    console.log(`   ✓ Déduplication SHA-256 : ${candidates.length} candidats qualifiés (${duplicatesCount} doublons éliminés).`);

    // 2. Encapsulation en Paquets Cognitifs
    const streamPackets = [];
    for (const item of candidates) {
      const packet = encapsulateEventToPacket(item);
      streamPackets.push(packet);
      allPackets.push(packet);
    }
    console.log(`   ✓ Encapsulation : ${streamPackets.length} Cognitive Packet Capsules fermées (Schema: cogentia.packet_capsule/v1).`);

    // 3. Branches exploratoires indépendantes & Convergence (#123)
    let totalBranches = 0;
    const streamConvergences = [];
    for (const pkt of streamPackets) {
      const exploration = exploreEventIndependentBranches(pkt, options);
      totalBranches += exploration.branches_count;
      
      const convergence = buildConvergenceCheckpoint(exploration, options);
      streamConvergences.push(convergence);
      allConvergences.push(convergence);
    }
    console.log(`   ✓ Exploration Décorrélée : ${totalBranches} branches indépendantes évaluées (mutual_exposure: none).`);
    console.log(`   ✓ Convergence Checkpoints : ${streamConvergences.length} synthèses produites sans consensus artificiel.`);

    // 4. Comptabilisation de charge (Issue #140)
    const elapsedStreamSec = (Date.now() - startedAt) / 1000;
    const streamMeasurement = createWorkloadMeasurementLog(streamName, {
      input_items: rawItems.length,
      candidate_items: candidates.length,
      packets_count: streamPackets.length,
      branches_count: totalBranches,
      source_count: rawItems.length,
      wall_time_seconds: elapsedStreamSec,
      continuations_created: streamConvergences.reduce((acc, c) => acc + c.new_continuations.length, 0),
      reality_tests_count: streamConvergences.reduce((acc, c) => acc + c.reality_tests.length, 0)
    }, options);

    allWorkloadLogs.push(streamMeasurement);
    streamStats[streamName] = {
      raw_items: rawItems.length,
      candidates: candidates.length,
      packets: streamPackets.length,
      branches: totalBranches,
      convergences: streamConvergences.length
    };
    console.log("");
  }

  // 5. Cycle de Sommeil Borné (Consolidation Issue #124)
  console.log("🌙 [Cycle de Sommeil — Sleep Cycle Consolidation]");
  const sleepResult = runRossignolSleepCycle(allPackets, allConvergences, options);
  console.log(`   ✓ Consolidation achevée : ${sleepResult.consolidated_convergences_count} convergences unifiées.`);
  console.log(`   ✓ Incohérences / Tensions repérées : ${sleepResult.detected_contradictions_count} (orientées vers arbitrage humain).`);
  console.log(`   ✓ File de revue append-only : ${sleepResult.queued_review_items.length} éléments en attente d'arbitrage.\n`);

  // 6. Projections EuroHPC 90 jours
  const elapsedTotalSec = (Date.now() - startedAt) / 1000;
  const sampleStats = {
    input_tokens: allPackets.length * 750,
    output_tokens: allConvergences.length * 1400,
    gpu_seconds: elapsedTotalSec * 0.72
  };
  const projections = project90DayEnvelopes(sampleStats);

  // 7. Écriture des artefacts sur disque
  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(options.outputDir || outputDir, `rossignol_workload_${timestampStr}.json`);
  const convergenceFile = path.join(options.outputDir || outputDir, `rossignol_convergence_${timestampStr}.json`);
  const sleepFile = path.join(options.outputDir || outputDir, `rossignol_sleep_${timestampStr}.json`);

  fs.writeFileSync(logFile, JSON.stringify(allWorkloadLogs, null, 2), "utf8");
  fs.writeFileSync(convergenceFile, JSON.stringify(allConvergences, null, 2), "utf8");
  fs.writeFileSync(sleepFile, JSON.stringify(sleepResult, null, 2), "utf8");

  // Affichage du tableau récapitulatif pour la campagne sénatoriale
  console.log("==========================================================================");
  console.log(" 🗳️  SYNTHÈSE STRATÉGIQUE — VEILLE CORSE POUR LE SÉNAT (27 SEPTEMBRE 2026)");
  console.log("==========================================================================");
  
  const corsicaConvergences = allConvergences.filter(c => !c.event_title.includes("EuroHPC") && !c.event_title.includes("protocoles"));
  
  for (const conv of corsicaConvergences) {
    console.log(`\n📌 [Dossier Territorial] ${conv.event_title}`);
    console.log(`   • Accords identifiés : ${conv.agreements[0]}`);
    console.log(`   • Point de tension / Débat : ${conv.conflicts[0]}`);
    console.log(`   • Arbitrage pour Jean Hugues Robert : ${conv.unresolved_discriminants[0]}`);
    console.log(`   • Action immédiate : ${conv.new_continuations[0]?.title || "Mise à jour mémoire"}`);
  }

  console.log("\n==========================================================================");
  console.log(" 📊 MODÉLISATION DE CHARGE & PROJECTION EUROHPC 90 JOURS (#140)");
  console.log("==========================================================================");
  console.log(`• Régime Baseline    : ~${projections.regimes.baseline.total_90d_gpu_hours} GPU-heures (${projections.regimes.baseline.recommended_system})`);
  console.log(`• Régime Exploration : ~${projections.regimes.exploration.total_90d_gpu_hours} GPU-heures (${projections.regimes.exploration.recommended_system})`);
  console.log(`• Régime Abondance   : ~${projections.regimes.abundance.total_90d_gpu_hours} GPU-heures (${projections.regimes.abundance.recommended_system})`);
  console.log("==========================================================================");
  console.log(`✅ Fichiers de mesure enregistrés dans : ${options.outputDir || outputDir}\n`);

  return {
    status: "ok",
    wall_time_seconds: elapsedTotalSec,
    packets_count: allPackets.length,
    convergences_count: allConvergences.length,
    sleep_cycle: sleepResult,
    workload_logs: allWorkloadLogs,
    projections,
    files: {
      workload_log: logFile,
      convergence: convergenceFile,
      sleep_cycle: sleepFile
    }
  };
}

// Execution if invoked directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const options = parseArgs();
  runRossignolPipeline(options).catch(err => {
    console.error("❌ Rossignol Runner failed:", err);
    process.exit(1);
  });
}
