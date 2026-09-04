import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  orientQuestion,
  emitQuestionContinuation,
  evaluateAnswer,
  runSenatorialesIocSuite,
  generateSenatorialesReport,
  loadAnswersFromSources,
  registerSenatorialesModule,
} from "./lib/senatoriales-ioc.js";
import { findModulesByCapability } from "./lib/v3-modules.js";

async function main() {
  // Test 1: Orientation
  const q1 = {
    id: "senat_dgf_finances_rurales",
    question: "Si l'autonomie institutionnelle transfère le pouvoir fiscal à la Collectivité de Corse, qui garantit que la DGF et les dotations d'équipement de mon village de 150 habitants ne seront pas rognées au profit des agglomérations d'Ajaccio et Bastia ?",
    expected: ["DGF", "communes rurales", "autonomie de capacité", "sanctuarisation", "péréquation"],
  };
  const oriented = orientQuestion(q1);
  assert.equal(oriented.id, q1.id);
  assert.ok(oriented.targets.length >= 1, "Should have at least 1 local target");
  assert.ok(oriented.targets[0].exists, "Primary target document should exist locally");
  assert.match(oriented.targets[0].path, /fiche_01/);

  // Test 2: Continuation packet emission
  const ctn = emitQuestionContinuation(oriented);
  assert.equal(ctn.protocol, "cogentia.continuation.v2");
  assert.equal(ctn.status, "active");
  assert.equal(ctn.continuation_id, `ctn_senat_${q1.id}`);
  assert.ok(ctn.context.expected_signals.includes("DGF"));

  // Test 3: Evaluation with perfect answer
  const sampleAnswer = "La loi organique doit garantir l'autonomie de capacité des communes rurales par la sanctuarisation de la DGF et une péréquation [cogentia:research/campaign/fiches_maires/fiche_01_autonomie_de_capacite_finances_communales.md#L46-L49].";
  const ev = evaluateAnswer(q1, sampleAnswer);
  assert.equal(ev.ok, true);
  assert.equal(ev.signal_score, 1);
  assert.equal(ev.citations_count, 1);
  assert.equal(ev.leaks.windows_path, false);
  assert.equal(ev.leaks.meta_opening, false);

  // Test 4: Evaluation catching leaks & meta-preamble
  const dirtyAnswer = "Je m'appuie sur C:\\tweesic\\doc.md pour dire que la DGF est sanctuarisée.";
  const evDirty = evaluateAnswer(q1, dirtyAnswer);
  assert.equal(evDirty.leaks.windows_path, true);
  assert.equal(evDirty.leaks.meta_opening, true);

  // Test 5: Suite execution with local answers file
  const answersFile = path.resolve(".cogentia/evals/senat-ioc/senat-answers-ioc.json");
  if (fs.existsSync(answersFile)) {
    const suite = await runSenatorialesIocSuite({
      answers: answersFile,
      limit: 3,
    });
    assert.equal(suite.count, 3);
    assert.equal(suite.evaluated_count, 3);
    assert.equal(suite.ok, true);

    const report = generateSenatorialesReport(suite);
    assert.match(report, /# Rapport d'Évaluation Locale IoC/);
    assert.match(report, /PASS/);
  }

  // Test 6: Capability registration in v3 modules
  registerSenatorialesModule();
  const modules = findModulesByCapability("senatoriales.eval");
  assert.ok(modules.length >= 1, "Module senatoriales.eval must be registered in v3 registry");

  console.log("ok - senatoriales-ioc tests passed successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
