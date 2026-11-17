#!/usr/bin/env python3
"""Read-only blind evaluation of existing Cogentia corpus.orient & search.

Question prompts are passed to the live tools. Gold is loaded ONLY after all
ten probes. This evaluates document navigation, not an autonomous LLM judge.
"""
from pathlib import Path
from datetime import datetime,timezone
from urllib import request,parse
import hashlib,json,os,re,subprocess,sys,time

ROOT=Path(__file__).resolve().parents[2]
REPOS=Path('/srv/cogentia/repos')
SUITE=os.getenv('COGENTIA_PRIOR_ART_SUITE','original')
if SUITE not in ('original','holdout'):
 raise ValueError('invalid fixture suite')
QFILE=ROOT/('scripts/fixtures/prior-art-holdout-questions.json' if SUITE=='holdout' else 'scripts/fixtures/prior-art-navigation-questions.json')
GFILE=ROOT/('scripts/fixtures/prior-art-holdout-gold.json' if SUITE=='holdout' else 'scripts/fixtures/prior-art-navigation-gold.json')
ORIENT_ONLY=os.getenv('COGENTIA_EVAL_ORIENT_ONLY','0')=='1'
REG=os.getenv('COGENTIA_REGISTRY','/srv/cogentia/repos/JeanHuguesRobert/.cogentia.json')
ENDPOINT=os.getenv('COGENTIA_EVAL_ENDPOINT','http://127.0.0.1:8790').rstrip('/')
if not re.fullmatch(r'http://127[.]0[.]0[.]1:[0-9]{2,5}',ENDPOINT):
 raise ValueError('eval endpoint must be loopback')
STOP=set('une pour quel quelle quand sans avec dans leurs elles entre doit elle ils leur etre avoir faire mais alors est les des deux tout qui que pas plus par sur ses son cette comme quelles dont fois nous peut chez jour meme deja sont etait cela faut'.split())

def load(path):return json.loads(path.read_text())
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def route(query):
 # Exercise the already deployed, read-only Cogentia daemon rather than
 # incurring repeated CLI/bootstrap startup on every question.
 u=ENDPOINT+'/api/context/orient?'+parse.urlencode({
  'q':query,'max_seeds':'5','max_hops':'2','max_nodes':'28'})
 try:
  with request.urlopen(u,timeout=30) as response:data=json.load(response)
  return {'ok':data.get('ok') is True,
   'sources':[{'repo':x['repo'],'path':x['path'],'provenance':x.get('provenance')}
             for x in data.get('read_first',[])[:10] if x.get('repo') and x.get('path')],
   'concepts':[x.get('name') for x in data.get('resolved_concepts',[])[:3]],'error':None}
 except Exception as e:
  return {'ok':False,'sources':[],'concepts':[],'error':type(e).__name__}

def search(query):
 if not query:return {'ok':False,'results':[],'error':'empty_query'}
 u=ENDPOINT+'/api/context/search?'+parse.urlencode({'q':query,'limit':'12','mode':'keyword'})
 try:
  with request.urlopen(u,timeout=18) as response:data=json.load(response)
  return {'ok':data.get('ok') is True,
   'results':[{'id':x.get('id'),'repo':x.get('repo'),'path':x.get('path'),
      'start_line':x.get('start_line'),'end_line':x.get('end_line')}
      for x in data.get('results',[])],
   'error':None}
 except Exception as e:return {'ok':False,'results':[],'error':type(e).__name__}

def focus(query):
 raw=re.sub(r'[\u0300-\u036f]','',__import__('unicodedata').normalize('NFD',query.lower()))
 tokens=re.findall('[a-z0-9]{4,}',raw)
 distinct=list(dict.fromkeys(t for t in tokens if t not in STOP))
 return ' '.join(distinct[:3])

def safe_document(repo,rel):
 if not re.fullmatch(r'[A-Za-z0-9_-]+',str(repo)) or not re.fullmatch(r'[A-Za-z0-9_./-]+',str(rel)) or '..' in rel or rel.startswith('/'):return None
 p=REPOS/repo/rel
 return p if p.is_file() else None

def interval_contains(result,needle):
 f=safe_document(result.get('repo'),result.get('path'))
 start,end=result.get('start_line'),result.get('end_line')
 if not f or not isinstance(start,int) or not isinstance(end,int) or start<1 or end<start or end-start>250:return False
 lines=f.read_text().splitlines()
 return needle.lower() in '\n'.join(lines[start-1:end]).lower()

def run(destination):
 questions=load(QFILE)
 if len(questions.get('cases',[]))!=10:raise ValueError('expected 10 questions')
 results=[]
 for i,x in enumerate(questions['cases']):
  began=time.monotonic()
  sys.stderr.write('[prior-art] {}/10 {}\n'.format(i+1,x['id']))
  orient=route(x['question'])
  short=focus(x['question'])
  if ORIENT_ONLY:
   raw={'ok':True,'results':[],'error':'not_measured'}
   focused={'ok':True,'results':[],'error':'not_measured'}
  else:
   raw=search(x['question'])
   focused=search(short)
  results.append({'id':x['id'],'question':x['question'],
    'orientation':orient,'keyword_raw':raw,'keyword_focus':focused,
    'focused_query':short,'elapsed_ms':round((time.monotonic()-began)*1000)})
 # An unavailable router is an invalid test environment, NOT a zero score.
 # Fail before accessing gold to preserve correct experimental semantics.
 if any(not r['orientation']['ok'] for r in results):
  failures=[r['id']+':'+str(r['orientation']['error']) for r in results if not r['orientation']['ok']]
  raise RuntimeError('orientation_not_executed: '+','.join(failures))
 if any(not r['keyword_raw']['ok'] or not r['keyword_focus']['ok'] for r in results):
  raise RuntimeError('keyword_retrieval_not_executed')
 # Golden files are ONLY loaded after every query has been issued.
 gold=load(GFILE)
 truth={x['id']:x for x in gold['cases']}
 if len(truth)!=10:raise ValueError('invalid gold')
 for rec in results:
  expected=truth[rec['id']]
  rec['gold_status']=expected['status']
  rec['gold_references']=[x['repo']+'/'+x['path'] for x in expected['references']]
  for g in expected['references']:
   f=safe_document(g['repo'],g['path'])
   if f is None or ('needle' in g and g['needle'].lower() not in f.read_text().lower()):
    raise ValueError('broken gold anchor: '+rec['id'])
  if expected['status']=='undetermined':
   rec['score']={'novelty_judgment':'unmeasured','no_gold_by_design':True}
   continue
  targets=set(rec['gold_references'])
  idof=lambda x:x['repo']+'/'+x['path']
  orient=[idof(x) for x in rec['orientation']['sources']]
  raw=[idof(x) for x in rec['keyword_raw']['results']]
  focused=[idof(x) for x in rec['keyword_focus']['results']]
  found=[]
  for match in rec['keyword_raw']['results']+rec['keyword_focus']['results']:
   for gold_entry in expected['references']:
    if match['repo']==gold_entry['repo'] and match['path']==gold_entry['path'] and gold_entry.get('needle') and interval_contains(match,gold_entry['needle']):
     found.append(match.get('id'))
  rec['score']={
   'orient_top1':bool(orient and orient[0] in targets),
   'orient_top8':bool(set(orient[:8]) & targets),
   'keyword_raw_top8':None if ORIENT_ONLY else bool(set(raw[:8]) & targets),
   'keyword_focus_top8':None if ORIENT_ONLY else bool(set(focused[:8]) & targets),
   'combined_top8':None if ORIENT_ONLY else bool(set(orient[:8]+raw[:8]+focused[:8]) & targets),
   'passage_verified':None if ORIENT_ONLY else bool(found),
   'verified_source_ids':list(dict.fromkeys(found))[:3],
  }
 established=[r for r in results if r['gold_status']=='established']
 count=lambda k:sum(1 for r in established if r['score'][k])
 summary={'questions':len(results),'known_prior_art':len(established),
  'undetermined_controls':len(results)-len(established),
  'orient_top1':count('orient_top1'),'orient_top8':count('orient_top8'),
  'keyword_raw_top8':None if ORIENT_ONLY else count('keyword_raw_top8'),
  'keyword_focus_top8':None if ORIENT_ONLY else count('keyword_focus_top8'),
  'combined_source_top8':None if ORIENT_ONLY else count('combined_top8'),
  'verified_passage':None if ORIENT_ONLY else count('passage_verified'),
  'autonomous_reasoner_qa_evaluated':0,
  'false_novelty_claims':'not measured: no LLM used'}
 out={'schema':'cogentia.prior-art-navigation-blind-eval/v1',
  'generated_at':datetime.now(timezone.utc).isoformat(),
  'fixture_set':SUITE,
  'input_sha256':digest(QFILE),'gold_sha256':digest(GFILE),
  'gold_exposed_to_retrievers':False,
  'source_commit':subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip(),
  'inference_provider':'none; actual local orientation' if ORIENT_ONLY else 'none; actual local orientation and keyword retrieval',
  'evaluation_mode':'orient_only' if ORIENT_ONLY else 'full',
  'summary':summary,'cases':results,
  'limitations':['No LLM was used: navigation only, not autonomous answer quality.',
   'Keyword retrieval and passages were not measured in this run.' if ORIENT_ONLY else 'Keyword retrieval and passages were measured in this run.',
   'An orientation path is a candidate, not a verified passage.',
   'The holdout fixture has file-level gold but no passage anchors: passage_verified is not scored for that suite.',
   'The two undetermined controls cannot establish global novelty.',
   'The lexical focus is only a deterministic three-token heuristic.']}
 destination.parent.mkdir(parents=True,exist_ok=True)
 destination.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 destination.chmod(0o600)
 print(json.dumps({'ok':True,'summary':summary,'output':str(destination)},ensure_ascii=False,indent=2))

if __name__=='__main__':
 if len(sys.argv)!=3 or sys.argv[1]!='--output' or not Path(sys.argv[2]).is_absolute():
  sys.exit('Usage: python3 scripts/ops/eval-prior-art-navigation.py --output /absolute/report.json')
 run(Path(sys.argv[2]))
