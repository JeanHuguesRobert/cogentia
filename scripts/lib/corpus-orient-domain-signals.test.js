import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceBoundDomainSeeds } from "./corpus-orient-domain-signals.js";
import { orientCorpus, projectOrientationForAgent } from "./corpus-orient.js";

const root = new URL("../fixtures/", import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, root), "utf8"));
const refs = [
  ["cogentia","research/cognitive_packet_switching.md"],
  ["cogentia","research/calculette_of_the_mind.md"],
  ["cogentia","research/locality_principle.md"],
  ["cogentia","research/optimistic_mainline_governance.md"],
  ["cogentia","research/capability_authority_control_data_planes_2026-11-10.md"],
  ["cogentia","research/cognitive_packets.md"],
  ["cogentia","research/living_book_press_architecture.md"],
  ["inseme","packages/magistral/docs/object-memory-v0.md"],
];
const docs = refs.map(([repo, rel])=>({repo,rel,title:rel,document_role:"source"}));

test("source-bound cross-lingual routing recovers anchored references in both fixed sets", () => {
  for (const [questionsFile,goldFile] of [
    ["prior-art-navigation-questions.json","prior-art-navigation-gold.json"],
    ["prior-art-holdout-questions.json","prior-art-holdout-gold.json"],
  ]) {
    const q=read(questionsFile),gold=new Map(read(goldFile).cases.map(x=>[x.id,x]));
    for(const item of q.cases){
      const expected=gold.get(item.id);
      const route=sourceBoundDomainSeeds(item.question,docs,5);
      if(expected.status==="undetermined"){
        assert.equal(route.length,0,item.id+" produced a speculative source");
        continue;
      }
      const targets=new Set(expected.references.map(x=>x.repo+"/"+x.path));
      assert.ok(route.some(x=>targets.has(x.repo+"/"+x.rel)),item.id+" source not recovered");
    }
  }
});

test("invisible candidate sources are never suggested from the dictionary", () => {
  const question="Un message peut-il être transmis demain après une coupure de connexion ?";
  assert.equal(sourceBoundDomainSeeds(question,[],4).length,0);
  const visible=docs.filter(x=>x.repo!=="inseme");
  const q="Les mêmes octets sur deux disques doivent-ils garder une identité unique ?";
  assert.equal(sourceBoundDomainSeeds(q,visible).some(x=>x.repo==="inseme"),false);
});

test("domain candidates are explicitly advisory, while direct title routing remains intact", () => {
  const p=orientCorpus({
    query:"Une machine techniquement capable d'effectuer une opération a-t-elle nécessairement le droit de la faire ?",
    documents:docs,concepts:[],
  });
  assert.equal(p.read_first[0].path,"research/capability_authority_control_data_planes_2026-11-10.md");
  assert.equal(p.read_first[0].provenance,"semantic_candidate");
  assert.equal(p.sufficiency.status,"structurally_exhausted");
  const name=orientCorpus({query:"Cognitive Packet Switching",documents:docs,concepts:[]});
  assert.equal(name.read_first[0].path,"research/cognitive_packet_switching.md");
});

test("agent receipt retains source-bound route before a peripheral explicit alias", () => {
  const p=orientCorpus({
    query:"Une machine capable a-t-elle le droit de faire une opération ?",
    documents:[
      ...docs,
      {repo:"barons-Mariani",rel:"projects/capable/README.md",
        title:"Capable",document_role:"source"},
    ],
    concepts:[],
  });
  const projected=projectOrientationForAgent(p);
  assert.equal(projected.read_first[0].path,
    "research/capability_authority_control_data_planes_2026-11-10.md");
  assert.equal(projected.read_first[0].routing_signal,"source_bound_domain");
  assert.equal(projected.evidence_status,"unverified_navigation_hints");
});

test("operational frontmatter under research/ remains a readable source", () => {
  const p=orientCorpus({
    query:"Machine techniquement capable autorisée à exécuter une opération",
    documents:[{repo:"cogentia",
      rel:"research/capability_authority_control_data_planes_2026-11-10.md",
      title:"Capability and Authority",document_role:"operational"}],
  });
  assert.equal(p.read_first[0].path,
    "research/capability_authority_control_data_planes_2026-11-10.md");
  assert.equal(p.implementation_evidence.length,0);
});

test("unresolved prose in concept Used in list cannot become a source path", () => {
  const p=orientCorpus({query:"Kudos",concepts:[{
    repo:"cogentia",name:"Kudos",documents:["unverified commentary about prior work"],
  }],documents:[]});
  assert.equal(p.read_first.length,0);
  assert.equal(p.then_read.length,0);
  assert.equal(p.implementation_evidence.length,0);
});
