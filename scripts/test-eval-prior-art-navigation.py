#!/usr/bin/env python3
"""Offline guard tests for the public-corpus blind navigation evaluator."""
from pathlib import Path
from unittest import TestCase,main,mock
import importlib.util,tempfile
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/ops/eval-prior-art-navigation.py'
spec=importlib.util.spec_from_file_location('prior_art_blind_eval',SCRIPT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PriorArtNavigationTest(TestCase):
 def test_fixtures_and_source_anchors(self):
  questions=module.load(module.QFILE);gold=module.load(module.GFILE)
  self.assertEqual(len(questions['cases']),10)
  self.assertEqual(len(gold['cases']),10)
  self.assertEqual(sum(x['status']=='established' for x in gold['cases']),8)
  self.assertEqual(sum(x['status']=='undetermined' for x in gold['cases']),2)
  self.assertEqual(len(set(x['id'] for x in questions['cases'])),10)
  for case in gold['cases']:
   for ref in case['references']:
    p=module.safe_document(ref['repo'],ref['path'])
    self.assertIsNotNone(p,case['id'])
    self.assertIn(ref['needle'].lower(),p.read_text().lower(),case['id'])

 def test_refuse_private_paths(self):
  self.assertIsNone(module.safe_document('cogentia','../../etc/passwd'))
  self.assertIsNone(module.safe_document('cogentia','/etc/passwd'))
  self.assertIsNone(module.safe_document('../barons-Mariani','foo.md'))

 def test_focused_query_not_gold_rewrite(self):
  f=module.focus("Une machine techniquement capable d'effectuer une opération a-t-elle nécessairement le droit de la faire ?")
  self.assertIn('machine',f)
  self.assertNotIn('authority',f)

 def test_router_failure_is_not_counted_as_zero_recall(self):
  calls=[]
  real_load=module.load
  def safe_load(path):
   if path==module.GFILE:raise AssertionError('gold read before router validated')
   return real_load(path)
  with tempfile.TemporaryDirectory() as td, \
    mock.patch.object(module,'route',side_effect=lambda q:(calls.append(q) or {'ok':False,'sources':[],'concepts':[],'error':'unavailable'})), \
    mock.patch.object(module,'search',return_value={'ok':True,'results':[],'error':None}), \
    mock.patch.object(module,'load',side_effect=safe_load):
   out=Path(td)/'bad-result.json'
   with self.assertRaisesRegex(RuntimeError,'orientation_not_executed'):
    module.run(out)
   self.assertFalse(out.exists())
  self.assertEqual(len(calls),10)

if __name__=='__main__':main()
