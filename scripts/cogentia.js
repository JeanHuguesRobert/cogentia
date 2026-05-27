#!/usr/bin/env node
/**
 * cogentia.js — Cogentia Commons CLI
 *
 * Infrastructure for traceable, auditable, AI-connectable
 * distributed knowledge production across git repositories.
 *
 * Each registered repository maintains a research/index.md —
 * a map of published work, work in progress, and open possibilities.
 * Together they form a distributed knowledge graph, navigable by
 * humans and AI agents alike.
 *
 * Usage:
 *   node scripts/cogentia.js <command> [args] [--json]
 *
 * Commands:
 *   add <name|path>     Add a repo to the registry
 *   remove <name>       Remove a repo from the registry
 *   list                List registered repos and their status
 *   status              Quick health check across all repos
 *   scan                Full scan — list all markdown, flag unreferenced
 *   init [name]         Bootstrap research/index.md (Jekyll-ready)
 *   ref <file>          Generate a research/index.md entry for a file
 *   open [name]         Open research/index.md in default editor
 *   sync                git pull in all repos
 *   graph               Generate Mermaid cross-reference graph
 *   check               Validate internal links in all research/index.md
 *   jekyll              Ensure Jekyll frontmatter in all research/index.md
 *   whoami              Print detected GitHub identity + registry location
 *   stamp <file>        Stamp canonical_url into a markdown file's front-matter
 *   stamp --all         Stamp every research-grade .md across registered repos
 *                       (combine with --check to preview without writing)
 *   corpus-status [name]  Refresh research/corpus-status.md (auto-generate
 *                         structural parts, preserve manual sections, bootstrap
 *                         the file if missing). Add --check for dry-run.
 *   documents             Refresh research/documents.md in the registry repo:
 *                         every tracked repo's markdown listed reverse-chrono
 *                         on activity, chrono on authorship, with per-repo
 *                         anchors. Add --check for dry-run.
 *   forks <name>          List GitHub forks of a registered repo (owner, stars,
 *                         pushed date, URL). Auth resolves: --github-token >
 *                         GITHUB_TOKEN env > gh CLI > anonymous (60 req/h).
 *   concepts <sub>      Manage research/concepts.md as a typed concept registry
 *                       without performing semantic interpretation.
 *   manifest            OpenAI-compatible tool definitions for every command
 *                       (machine-discoverable surface; --json for AI agents).
 *   state               Denormalised JSON snapshot of registry+status+identity.
 *   explain-ignore <f>  Report whether a file is matched by .cogentiaignore.
 *   help                Show this help
 *
 * Global flags (any command):
 *   --json                       Machine-readable JSON output.
 *   --registry <path>            Override registry location. Also honours
 *                                COGENTIA_REGISTRY env var.
 *   --cwd <path>                 Change working directory before running.
 *   --narrative-short <text>     Short description; appended to .cogentia/audit.jsonl.
 *   --narrative-long <text>      Long description / reasoning.
 *   --chat-url <url>             Conversational-agent session URL (repeatable).
 *   --github-token <token>       Override GitHub API token. Also honours
 *                                GITHUB_TOKEN env var; falls back to
 *                                `gh auth token`, then anonymous mode.
 *   --include-orphans            Mermaid diagrams (corpus-status, graph,
 *                                concepts graph) hide degree-0 nodes by
 *                                default; this flag restores them.
 *
 * Flags:
 *   --json              Output machine-readable JSON (status, scan, graph)
 *
 * Config:  .cogentia.json   — registry, searched upward from CWD, created on first add.
 * Ignore:  .cogentiaignore  — per-repo, lists files that are not research deliverables
 *                             (line-per-pattern, supports basename or path globs `*`/`**`,
 *                             merged with built-in defaults: README, LICENSE, TODO,
 *                             CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT).
 *
 * Platform: Linux, macOS, Windows. Zero npm dependencies.
 *
 * Repository: github.com/JeanHuguesRobert/cogentia
 * License: MIT
 */

import fs           from "fs";
import path         from "path";
import { execSync } from "child_process";
import https        from "https";
import http         from "http";

// ── Platform detection ────────────────────────────────────────────────────────

const IS_WINDOWS = process.platform === "win32";

// ANSI colors: enabled on any terminal that isn't plain Windows CMD
const COLOR = !IS_WINDOWS
  || process.env.WT_SESSION          // Windows Terminal
  || process.env.TERM_PROGRAM        // VS Code / other
  || ( process.env.TERM && process.env.TERM !== "dumb" );

const c = {
  reset:   COLOR ? "\x1b[0m"  : "",
  bold:    COLOR ? "\x1b[1m"  : "",
  dim:     COLOR ? "\x1b[2m"  : "",
  green:   COLOR ? "\x1b[32m" : "",
  yellow:  COLOR ? "\x1b[33m" : "",
  red:     COLOR ? "\x1b[31m" : "",
  cyan:    COLOR ? "\x1b[36m" : "",
  blue:    COLOR ? "\x1b[34m" : "",
  magenta: COLOR ? "\x1b[35m" : "",
};

// Semantic shortcuts
const ok    = s => `${c.green}✅ ${s}${c.reset}`;
const warn  = s => `${c.yellow}⚠️  ${s}${c.reset}`;
const fail  = s => `${c.red}❌ ${s}${c.reset}`;
const info  = s => `${c.cyan}ℹ️  ${s}${c.reset}`;
const hdr   = s => `${c.bold}${c.blue}${s}${c.reset}`;
const dim   = s => `${c.dim}${s}${c.reset}`;
const bold  = s => `${c.bold}${s}${c.reset}`;

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv      = process.argv.slice( 2 );
const JSON_MODE = argv.includes( "--json" );

// Value-flags consume the following argv entry as their value (also support --flag=value).
const VALUE_FLAGS = new Set( [
  "--registry", "--cwd",
  "--narrative-short", "--narrative-long", "--chat-url",
  "--paper", "--topic", "--from", "--reason", "--status",
  "--github-token", "--limit",
] );

/** Return the value of a `--flag value` or `--flag=value` option. Null if absent. */
function getFlagValue( name ) {
  const eq = argv.find( a => a.startsWith( name + "=" ) );
  if ( eq ) return eq.slice( name.length + 1 );
  const i = argv.indexOf( name );
  if ( i >= 0 && i + 1 < argv.length ) return argv[ i + 1 ];
  return null;
}

/** Return all values for a repeatable value-flag (e.g. --chat-url). */
function getFlagValues( name ) {
  const out = [];
  for ( let i = 0; i < argv.length; i++ ) {
    if ( argv[ i ] === name && i + 1 < argv.length ) out.push( argv[ i + 1 ] );
    else if ( argv[ i ].startsWith( name + "=" ) ) out.push( argv[ i ].slice( name.length + 1 ) );
  }
  return out;
}

// Filter argv into positional args, accounting for value-flag-consumed positions.
const consumedPositions = new Set();
for ( let i = 0; i < argv.length; i++ ) {
  if ( VALUE_FLAGS.has( argv[ i ] ) ) consumedPositions.add( i + 1 );
}
const args = argv.filter( ( a, i ) =>
  !a.startsWith( "--" ) && !consumedPositions.has( i )
);
const [ command, ...cmdArgs ] = args;

// Registry override (precedence: flag > env > upward-search-from-cwd).
const REGISTRY_OVERRIDE = getFlagValue( "--registry" ) || process.env.COGENTIA_REGISTRY || null;

// CWD override.
const CWD_OVERRIDE = getFlagValue( "--cwd" );
if ( CWD_OVERRIDE ) {
  try { process.chdir( path.resolve( CWD_OVERRIDE ) ); }
  catch ( e ) { console.error( `cogentia: --cwd: ${e.message}` ); process.exit( 1 ); }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFIG_FILE        = ".cogentia.json";
const COGENTIA_INDEX_URL = "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/index.md";
const SKIP_DIRS          = new Set( [ ".git", "node_modules", ".next", "dist", "build", ".jekyll-cache", "_site" ] );

// ── Utilities ─────────────────────────────────────────────────────────────────

function pad( s, n, right = false ) {
  s = String( s );
  if ( s.length >= n ) return s.slice( 0, n );
  const padding = " ".repeat( n - s.length );
  return right ? padding + s : s + padding;
}

function fmtSize( bytes ) {
  if ( bytes < 1024 )        return pad( bytes + " B",   7, true );
  if ( bytes < 1024 * 1024 ) return pad( ( bytes / 1024 ).toFixed( 1 ) + " KB", 7, true );
  return pad( ( bytes / ( 1024 * 1024 ) ).toFixed( 1 ) + " MB", 7, true );
}

function fmtDate( d ) {
  return d instanceof Date ? d.toISOString().slice( 0, 10 ) : String( d ).slice( 0, 10 );
}

function fmtNow() {
  return new Date().toISOString().slice( 0, 16 ).replace( "T", " " );
}

function die( msg ) {
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { error: msg }, null, 2 ) );
  } else {
    console.error( fail( msg ) );
  }
  process.exit( 1 );
}

// ── Config management ─────────────────────────────────────────────────────────

function findConfig( startDir ) {
  // Explicit override (--registry or COGENTIA_REGISTRY) wins.
  if ( REGISTRY_OVERRIDE ) {
    const abs = path.resolve( REGISTRY_OVERRIDE );
    // Accept either a direct file path or a directory containing CONFIG_FILE.
    if ( fs.existsSync( abs ) ) {
      if ( fs.statSync( abs ).isDirectory() ) {
        const inDir = path.join( abs, CONFIG_FILE );
        return fs.existsSync( inDir ) ? inDir : null;
      }
      return abs;
    }
    return null;
  }
  // Upward search from CWD (legacy behaviour).
  let current = path.resolve( startDir );
  const visited = new Set();
  while ( true ) {
    if ( visited.has( current ) ) break;
    visited.add( current );
    const candidate = path.join( current, CONFIG_FILE );
    if ( fs.existsSync( candidate ) ) return candidate;
    const parent = path.dirname( current );
    if ( parent === current ) break;
    current = parent;
  }
  return null;
}

function loadConfig() {
  const configPath = findConfig( process.cwd() );
  if ( !configPath ) return { configPath: null, config: { repos: [], version: 1 } };
  try {
    const raw    = fs.readFileSync( configPath, "utf8" );
    const config = JSON.parse( raw );
    if ( !Array.isArray( config.repos ) ) config.repos = [];
    return { configPath, config };
  } catch ( e ) {
    die( `Cannot parse ${configPath}: ${e.message}` );
  }
}

function saveConfig( configPath, config ) {
  config.updated = new Date().toISOString();
  fs.writeFileSync( configPath, JSON.stringify( config, null, 2 ) + "\n", "utf8" );
}

function commonAncestor( a, b ) {
  const sep    = path.sep;
  const partsA = a.split( sep );
  const partsB = b.split( sep );
  const common = [];
  for ( let i = 0; i < Math.min( partsA.length, partsB.length ); i++ ) {
    if ( partsA[ i ] === partsB[ i ] ) common.push( partsA[ i ] );
    else break;
  }
  return common.join( sep ) || sep;
}

/**
 * Read the GitHub owner/repo from a repo's `origin` remote.
 * Returns { owner, repo } or null if it cannot be determined.
 */
function gitRemoteOwner( repoPath ) {
  try {
    const url = execSync( "git config --get remote.origin.url", {
      cwd: repoPath, encoding: "utf8",
    } ).trim();
    const m = url.match( /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/ );
    if ( !m ) return null;
    return { owner: m[ 1 ], repo: m[ 2 ] };
  } catch ( _ ) {
    return null;
  }
}

/**
 * Try to find the user's GitHub profile repo locally.
 * Convention: github.com/<user>/<user> is the user's profile repo. If a sibling
 * directory named <owner> exists at the workspace root AND is itself a git repo,
 * that's where .cogentia.json prefers to live.
 *
 * Returns the absolute path to the profile repo, or null.
 */
function detectProfileRepoLocation( seedRepoPath ) {
  const info = gitRemoteOwner( seedRepoPath );
  if ( !info ) return null;
  const workspaceRoot = path.dirname( path.resolve( seedRepoPath ) );
  const candidate     = path.join( workspaceRoot, info.owner );
  if ( fs.existsSync( candidate ) && isGitRepo( candidate ) ) return candidate;
  return null;
}

function resolveConfigPath( repoPaths ) {
  const existing = findConfig( process.cwd() );
  if ( existing ) return existing;

  // Try profile-repo detection on each candidate before falling back.
  for ( const p of repoPaths ) {
    const resolved = path.resolve( p );
    if ( !fs.existsSync( resolved ) || !isGitRepo( resolved ) ) continue;
    const profilePath = detectProfileRepoLocation( resolved );
    if ( profilePath ) return path.join( profilePath, CONFIG_FILE );
  }

  // Fallback: common ancestor of CWD + new repos.
  const allPaths = [ process.cwd(), ...repoPaths ].map( p => path.resolve( p ) );
  let common = allPaths[ 0 ];
  for ( const p of allPaths.slice( 1 ) ) common = commonAncestor( common, p );
  return path.join( common, CONFIG_FILE );
}

// ── Audit log (.cogentia/audit.jsonl) ─────────────────────────────────────────

const AUDIT_DIR  = ".cogentia";
const AUDIT_FILE = "audit.jsonl";

/** Collect --narrative-short / --narrative-long / --chat-url into a narrative block. */
function collectNarrative() {
  const short      = getFlagValue( "--narrative-short" );
  const long       = getFlagValue( "--narrative-long" );
  const chat_urls  = getFlagValues( "--chat-url" );
  if ( !short && !long && chat_urls.length === 0 ) return null;
  return {
    short:     short || null,
    long:      long  || null,
    chat_urls,
  };
}

/** Best-effort detection of the human actor running this command. */
function detectActor() {
  let gitUserName = null, gitUserEmail = null;
  try { gitUserName  = execSync( "git config --get user.name",  { encoding: "utf8" } ).trim() || null; } catch ( _ ) {}
  try { gitUserEmail = execSync( "git config --get user.email", { encoding: "utf8" } ).trim() || null; } catch ( _ ) {}
  return {
    git_user_name:  gitUserName,
    git_user_email: gitUserEmail,
    process_user:   process.env.USERNAME || process.env.USER || null,
    invoked_via:    "cogentia.js",
  };
}

/**
 * Append one JSON line to the audit log. Best-effort: if the registry is
 * unknown or the write fails, silently no-op rather than failing the command.
 */
function appendAudit( entry ) {
  const configPath = findConfig( process.cwd() );
  if ( !configPath ) return;
  try {
    const auditDir  = path.join( path.dirname( configPath ), AUDIT_DIR );
    if ( !fs.existsSync( auditDir ) ) fs.mkdirSync( auditDir, { recursive: true } );
    const auditPath = path.join( auditDir, AUDIT_FILE );
    const line      = JSON.stringify( {
      ts:      new Date().toISOString(),
      actor:   detectActor(),
      ...entry,
    } ) + "\n";
    fs.appendFileSync( auditPath, line, "utf8" );
  } catch ( _ ) { /* audit failures must not fail commands */ }
}

// ── Repo discovery ────────────────────────────────────────────────────────────

function isGitRepo( dir ) {
  return fs.existsSync( path.join( dir, ".git" ) );
}

function findRepoByName( name, startDir ) {
  let current = path.resolve( startDir );
  const visited = new Set();

  // Helper: check if a directory matches the name and is a git repo
  function isMatch( dir ) {
    return path.basename( dir ).toLowerCase() === name.toLowerCase()
      && fs.existsSync( dir )
      && fs.statSync( dir ).isDirectory()
      && isGitRepo( dir );
  }

  while ( true ) {
    if ( visited.has( current ) ) break;
    visited.add( current );

    // 1. Check direct children of current directory
    try {
      const children = fs.readdirSync( current );
      for ( const child of children ) {
        const candidate = path.join( current, child );
        try { if ( isMatch( candidate ) ) return candidate; } catch ( _ ) { /* skip */ }
      }
    } catch ( _ ) { /* permission error */ }

    // 2. Check siblings (children of parent)
    const parent = path.dirname( current );
    if ( parent !== current ) {
      try {
        const siblings = fs.readdirSync( parent );
        for ( const sibling of siblings ) {
          const candidate = path.join( parent, sibling );
          try { if ( isMatch( candidate ) ) return candidate; } catch ( _ ) { /* skip */ }
        }
      } catch ( _ ) { /* permission error */ }
    }

    if ( parent === current ) break;
    current = parent;
  }
  return null;
}

function resolveRepoPath( entry ) {
  if ( entry.path ) {
    // Normalize separators for current platform
    const normalized = entry.path.split( /[\\/]/ ).join( path.sep );
    if ( fs.existsSync( normalized ) ) return normalized;
  }
  return findRepoByName( entry.name, process.cwd() );
}

/** Find which registered repo a file belongs to. */
function findOwnerRepo( filePath, config ) {
  const abs = path.resolve( filePath );
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    if ( abs.startsWith( repoPath + path.sep ) || abs === repoPath ) {
      return { entry, repoPath };
    }
  }
  return null;
}

// ── Ignore patterns (.cogentiaignore) ─────────────────────────────────────────

const IGNORE_FILE = ".cogentiaignore";

// Always-ignored: workspace artefacts that are never research deliverables.
const BUILTIN_IGNORE = [
  "README.md",
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "TODO.md",
  "CHANGELOG.md",
  "CHANGES.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".cogentiaignore",
];

/** Load .cogentiaignore from a repo, merged with built-in defaults. */
function loadIgnore( repoPath ) {
  const ignorePath = path.join( repoPath, IGNORE_FILE );
  if ( !fs.existsSync( ignorePath ) ) return [ ...BUILTIN_IGNORE ];
  let userPatterns = [];
  try {
    userPatterns = fs.readFileSync( ignorePath, "utf8" )
      .split( /\r?\n/ )
      .map( l => l.split( "#" )[ 0 ].trim() )
      .filter( Boolean );
  } catch ( _ ) { /* unreadable → defaults only */ }
  return [ ...BUILTIN_IGNORE, ...userPatterns ];
}

/** Convert a glob pattern with `*` and `**` to a RegExp. */
function patternToRegex( p ) {
  let r = p.replace( /[.+^${}()|[\]\\]/g, "\\$&" );
  r = r.replace( /\*\*/g, "<<DSTAR>>" );
  r = r.replace( /\*/g, "[^/]+" );
  r = r.replace( /<<DSTAR>>/g, ".+" );
  return new RegExp( "^" + r + "$" );
}

/**
 * Test whether a relative path matches any ignore pattern.
 * - Pattern without `/` → match basename at any depth.
 * - Pattern with `/`    → match the full relative path (globs `*`/`**` allowed).
 */
function matchesIgnore( rel, patterns ) {
  const relNorm = rel.replace( /\\/g, "/" );
  const base    = path.basename( relNorm );
  for ( const p of patterns ) {
    if ( !p.includes( "/" ) ) {
      if ( base === p ) return true;
    } else {
      if ( patternToRegex( p ).test( relNorm ) ) return true;
    }
  }
  return false;
}

// ── Markdown analysis ─────────────────────────────────────────────────────────

function listMarkdown( dir, base ) {
  base = base || dir;
  let results = [];
  let entries;
  try { entries = fs.readdirSync( dir ); } catch ( _ ) { return results; }
  for ( const entry of entries ) {
    if ( SKIP_DIRS.has( entry ) ) continue;
    const full = path.join( dir, entry );
    let stat;
    try { stat = fs.statSync( full ); } catch ( _ ) { continue; }
    if ( stat.isDirectory() ) {
      results = results.concat( listMarkdown( full, base ) );
    } else if ( entry.toLowerCase().endsWith( ".md" ) ) {
      results.push( {
        rel:   path.relative( base, full ).replace( /\\/g, "/" ),
        full,
        size:  stat.size,
        mtime: stat.mtime,
      } );
    }
  }
  return results.sort( ( a, b ) => b.mtime - a.mtime );
}

/** Extract first H1 title from a markdown file. */
function extractTitle( filePath ) {
  try {
    const content = fs.readFileSync( filePath, "utf8" );
    const match   = content.match( /^#\s+(.+)$/m );
    return match ? match[ 1 ].trim() : path.basename( filePath, ".md" );
  } catch ( _ ) {
    return path.basename( filePath, ".md" );
  }
}

/** Extract all markdown links from content: [text](url) */
function extractLinks( content ) {
  const links = [];
  const re    = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ( ( m = re.exec( content ) ) !== null ) {
    links.push( { text: m[ 1 ], url: m[ 2 ] } );
  }
  return links;
}

/**
 * Resolve every relative markdown link in `indexContent` to an absolute
 * filesystem path, anchored at the index's directory. The returned Set is
 * the *real* "files referenced by the index" — replaces the loose
 * basename-substring heuristic that masked false-clean scans (doctrinal
 * Rule 4 — second_method.md names `scan` as canonical tooling).
 *
 * - Skips URLs with a scheme (http://, mailto:, etc.) and pure fragments.
 * - Strips #anchor and ?query before resolving.
 * - Decodes percent-encoding (e.g. spaces as %20).
 * - Does NOT verify the file exists; presence in the set means "linked",
 *   not "linked and valid" (use `cogentia check` for the latter).
 */
function buildReferencedFileSet( indexPath, indexContent ) {
  const indexDir = path.dirname( indexPath );
  const refs     = new Set();
  for ( const link of extractLinks( indexContent ) ) {
    let url = link.url.trim();
    if ( !url || url.startsWith( "#" ) ) continue;
    if ( /^[a-z][a-z0-9+.-]*:/i.test( url ) ) continue;
    url = url.split( "#" )[ 0 ].split( "?" )[ 0 ];
    if ( !url ) continue;
    let decoded;
    try { decoded = decodeURIComponent( url ); } catch ( _ ) { decoded = url; }
    refs.add( path.resolve( indexDir, decoded ) );
  }
  return refs;
}

/** Extract cross-repo references from a research/index.md */
function extractCrossRefs( indexPath, repoName, allRepoNames ) {
  const refs = [];
  if ( !fs.existsSync( indexPath ) ) return refs;
  const content = fs.readFileSync( indexPath, "utf8" );
  const links   = extractLinks( content );
  for ( const link of links ) {
    for ( const name of allRepoNames ) {
      if ( name === repoName ) continue;
      if ( urlMatchesRepoName( link.url, name ) ) {
        if ( !refs.includes( name ) ) refs.push( name );
      }
    }
  }
  return refs;
}

/**
 * True iff `url` contains `repoName` as a complete path segment.
 * Replaces a substring check (`url.includes('/cogentia')`) that
 * false-positively matched siblings (e.g. `cogentia-old`). Works for
 * absolute and relative URLs without URL-parser quirks.
 */
function urlMatchesRepoName( url, repoName ) {
  const escaped = repoName.replace( /[.+*?^${}()|[\]\\]/g, "\\$&" );
  return new RegExp( `(?:^|/)${escaped}(?:/|$|#|\\?)` ).test( url );
}

// ── Document self-address (stamp) ─────────────────────────────────────────────

/**
 * Insert or update `canonical_url` and `last_stamped_at` keys in a markdown
 * file's YAML front-matter. If no front-matter exists, prepend a minimal one.
 * Returns the new content (or the original if nothing changed).
 */
function stampFrontmatter( content, canonicalUrl, stampDate ) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match   = content.match( fmRegex );

  if ( !match ) {
    // No front-matter — prepend a minimal one.
    const fm = [
      "---",
      `canonical_url: ${canonicalUrl}`,
      `last_stamped_at: ${stampDate}`,
      "---",
      "",
    ].join( "\n" );
    return fm + content;
  }

  let fm = match[ 1 ];
  let changed = false;

  function upsert( key, value ) {
    const lineRe = new RegExp( `^${key}\\s*:.*$`, "m" );
    const newLine = `${key}: ${value}`;
    if ( lineRe.test( fm ) ) {
      const oldLine = fm.match( lineRe )[ 0 ];
      if ( oldLine !== newLine ) {
        fm = fm.replace( lineRe, newLine );
        changed = true;
      }
    } else {
      fm = fm + ( fm.endsWith( "\n" ) ? "" : "\n" ) + newLine;
      changed = true;
    }
  }

  upsert( "canonical_url", canonicalUrl );
  upsert( "last_stamped_at", stampDate );

  if ( !changed ) return content;
  return `---\n${fm}\n---\n` + content.slice( match[ 0 ].length );
}

/**
 * Stamp one markdown file with its canonical URL. Returns a result object.
 * If opts.check is true, do not write — just report what would change.
 */
function stampOne( filePath, opts ) {
  opts = opts || {};

  const { configPath, config } = loadConfig();
  if ( !configPath ) {
    return { ok: false, file: filePath, reason: "no registry" };
  }

  // If --repo <name> is given, resolve filePath relative to that repo's path
  // rather than relative to the current working directory. Without this,
  // `cogentia stamp research/foo.md --repo Inox` silently ignored the flag
  // and looked for the file under CWD, returning a confusing "not found".
  const repoFlagIdx = argv.indexOf( "--repo" );
  const repoFlag = repoFlagIdx >= 0 ? argv[ repoFlagIdx + 1 ] : null;
  let absPath;
  if ( repoFlag && !path.isAbsolute( filePath ) ) {
    const entry = config.repos.find( r => r.name === repoFlag );
    if ( !entry ) {
      return { ok: false, file: filePath, reason: `--repo "${repoFlag}" not in registry` };
    }
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) {
      return { ok: false, file: filePath, reason: `--repo "${repoFlag}" has no resolvable path` };
    }
    absPath = path.resolve( repoPath, filePath );
  } else {
    absPath = path.resolve( filePath );
  }
  if ( !fs.existsSync( absPath ) ) {
    return { ok: false, file: filePath, reason: `not found (resolved: ${absPath})` };
  }

  const owner = findOwnerRepo( absPath, config );
  if ( !owner ) {
    return { ok: false, file: filePath, reason: "not in any registered repo" };
  }

  const { entry, repoPath } = owner;
  const remoteInfo = gitRemoteOwner( repoPath );
  if ( !remoteInfo ) {
    return { ok: false, file: filePath, reason: "no usable git remote" };
  }

  const branch  = gitCurrentBranch( repoPath );
  const relPath = path.relative( repoPath, absPath ).replace( /\\/g, "/" );
  const canonicalUrl = `https://github.com/${remoteInfo.owner}/${remoteInfo.repo}/blob/${branch}/${relPath}`;
  const stampDate    = fmtDate( new Date() );

  const content = fs.readFileSync( absPath, "utf8" );
  const updated = stampFrontmatter( content, canonicalUrl, stampDate );

  if ( updated === content ) {
    return { ok: true, file: relPath, repo: entry.name, action: "unchanged", canonicalUrl };
  }
  if ( opts.check ) {
    return { ok: true, file: relPath, repo: entry.name, action: "would-update", canonicalUrl };
  }
  fs.writeFileSync( absPath, updated, "utf8" );
  appendAudit( {
    command: "stamp",
    args:    { file: relPath, repo: entry.name },
    result:  { canonicalUrl, action: "stamped" },
    narrative: opts.narrative || null,
  } );
  return { ok: true, file: relPath, repo: entry.name, action: "stamped", canonicalUrl };
}

// ── Corpus status ─────────────────────────────────────────────────────────────

const CORPUS_STATUS_BASENAMES = [ "corpus-status.md", "corpus_status.md" ];
const CORPUS_STATUS_CANONICAL = "corpus-status.md";

/** Replace content between <!-- BEGIN_AUTO: id --> and <!-- END_AUTO: id --> markers. */
function replaceMarkedSection( content, sectionId, body ) {
  const re = new RegExp(
    `(<!-- BEGIN_AUTO: ${sectionId} -->)[\\s\\S]*?(<!-- END_AUTO: ${sectionId} -->)`,
    "m"
  );
  if ( re.test( content ) ) {
    return { content: content.replace( re, `$1\n${body}\n$2` ), updated: true };
  }
  return { content, updated: false };
}

/** Extract a "## Heading" section body until the next "## " or "---" line. */
function extractIndexSection( content, heading ) {
  const lines = content.split( /\r?\n/ );
  let start = -1, end = lines.length;
  for ( let i = 0; i < lines.length; i++ ) {
    if ( lines[ i ].trim() === `## ${heading}` ) { start = i + 1; continue; }
    if ( start >= 0 && ( lines[ i ].startsWith( "## " ) || lines[ i ].trim() === "---" ) ) {
      end = i; break;
    }
  }
  if ( start < 0 ) return "";
  return lines.slice( start, end ).join( "\n" ).trim();
}

/** Pull published-table rows (without the header) from research/index.md content. */
function extractPublishedRows( indexContent ) {
  const block = extractIndexSection( indexContent, "Published" );
  if ( !block ) return [];
  return block.split( /\r?\n/ )
    .filter( l => l.startsWith( "|" ) && !/\|\s*-+\s*\|/.test( l ) && !/\|\s*Title\s*\|/i.test( l ) )
    .map( l => l.trim() );
}

/** Pull bulleted open-possibilities from research/index.md content. */
function extractOpenPossibilities( indexContent ) {
  const block = extractIndexSection( indexContent, "Open Possibilities" );
  if ( !block ) return [];
  return block.split( /\r?\n/ )
    .filter( l => l.trim().startsWith( "- " ) )
    .map( l => l.trim() );
}

function findCorpusStatusFile( repoPath ) {
  const dir = path.join( repoPath, "research" );
  for ( const base of CORPUS_STATUS_BASENAMES ) {
    const p = path.join( dir, base );
    if ( fs.existsSync( p ) ) return p;
  }
  return null;
}

function buildRegisteredReposBlock( config ) {
  const lines = [
    "| Repository | research/index.md | Branch | Last commit |",
    "|---|---|---|---|",
  ];
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) { lines.push( `| ${entry.name} | ❌ not found | — | — |` ); continue; }
    const indexPath = path.join( repoPath, "research", "index.md" );
    const hasIndex  = fs.existsSync( indexPath ) ? "✅" : "❌";
    const branch    = gitCurrentBranch( repoPath );
    const last      = gitLastCommit( repoPath ) || "—";
    lines.push( `| ${entry.name} | ${hasIndex} | ${branch} | ${last} |` );
  }
  return lines.join( "\n" );
}

// ── Mermaid helpers (shared by cross-repo and concept graphs) ─────────────────

/** Honour `--include-orphans` to suppress degree-0 node filtering. */
function includeOrphans() {
  return argv.includes( "--include-orphans" );
}

/** Set of node ids that appear in at least one edge (either side). */
function nodesWithEdges( edges, fromKey, toKey ) {
  const s = new Set();
  const fk = fromKey || "from";
  const tk = toKey   || "to";
  for ( const e of edges ) { s.add( e[ fk ] ); s.add( e[ tk ] ); }
  return s;
}

/** Mermaid `click` line for navigation. */
function mermaidClick( id, url, tooltip ) {
  return `  click ${id} "${url}"${tooltip ? ` "${tooltip}"` : ""}`;
}

function buildGraphBlock( config ) {
  const allNames = config.repos.map( r => r.name );
  const edges    = [];
  const remotes  = new Map(); // name → { owner, repo }
  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const remote = gitRemoteOwner( repoPath );
    if ( remote ) remotes.set( entry.name, remote );
    const indexPath = path.join( repoPath, "research", "index.md" );
    if ( !fs.existsSync( indexPath ) ) continue;
    const refs = extractCrossRefs( indexPath, entry.name, allNames );
    for ( const r of refs ) edges.push( { from: entry.name, to: r } );
  }

  const connected = nodesWithEdges( edges );
  const showAll   = includeOrphans();
  const visible   = showAll ? allNames : allNames.filter( n => connected.has( n ) );
  const orphans   = allNames.filter( n => !connected.has( n ) );

  const lines = [ "```mermaid", "graph LR" ];
  for ( const n of visible ) lines.push( `  ${n}["📄 ${n}"]` );
  for ( const e of edges )   lines.push( `  ${e.from} --> ${e.to}` );
  for ( const n of visible ) {
    const r = remotes.get( n );
    if ( r ) lines.push( mermaidClick( n, `https://github.com/${r.owner}/${r.repo}/blob/main/research/index.md`, "Open research/index.md" ) );
  }
  lines.push( "```" );
  if ( !showAll && orphans.length > 0 ) {
    lines.push( "" );
    lines.push( `*Orphan repos (no cross-references in \`research/index.md\`): ${orphans.map( n => `\`${n}\`` ).join( ", " )}. Re-include with \`--include-orphans\`.*` );
  }
  return lines.join( "\n" );
}

function buildPublishedBlock( repoPath, repoName ) {
  const indexPath = path.join( repoPath, "research", "index.md" );
  if ( !fs.existsSync( indexPath ) ) return "*(no `research/index.md` found.)*";
  const content = fs.readFileSync( indexPath, "utf8" );
  const rows = extractPublishedRows( content );
  if ( rows.length === 0 ) return "*(no entries in the *Published* section of `research/index.md`.)*";
  return [
    "| Title | Location | Date |",
    "|---|---|---|",
    ...rows,
  ].join( "\n" );
}

function buildPossibilitiesBlock( repoPath ) {
  const indexPath = path.join( repoPath, "research", "index.md" );
  if ( !fs.existsSync( indexPath ) ) return "*(no `research/index.md` found.)*";
  const content = fs.readFileSync( indexPath, "utf8" );
  const items = extractOpenPossibilities( content );
  if ( items.length === 0 ) return "*(no entries in the *Open Possibilities* section of `research/index.md`.)*";
  return items.join( "\n" );
}

function buildCorpusStatusSkeleton( entry, config, now ) {
  const remote = ( function() {
    const repoPath = resolveRepoPath( entry );
    return repoPath ? gitRemoteOwner( repoPath ) : null;
  } )();
  const repoSlug = remote ? `${remote.owner}/${remote.repo}` : entry.name;

  return [
    "---",
    `title: "Corpus Status — ${entry.name}"`,
    `description: "Current state of the ${entry.name} knowledge corpus — what is proved, what is open, what remains possible"`,
    "layout: default",
    "nav_order: 2",
    `last_modified_at: ${fmtDate( now )}`,
    "---",
    "",
    `# Corpus Status — ${entry.name}`,
    "",
    "*Auto-refreshed by `cogentia.js corpus-status`. The structural sections* —",
    "*Registered Repositories, Cross-Reference Graph, Published, What Remains Possible* —",
    "*are regenerated from the registry and from `research/index.md` on every run.*",
    "*The substantive sections* — *What Is Proved* *and* *Open Objections* —",
    "*are manually curated and preserved across refreshes.*",
    "",
    "---",
    "",
    "## Registered Repositories",
    "",
    "<!-- BEGIN_AUTO: registered_repos -->",
    "",
    "<!-- END_AUTO: registered_repos -->",
    "",
    "---",
    "",
    "## Cross-Reference Graph",
    "",
    "<!-- BEGIN_AUTO: graph -->",
    "",
    "<!-- END_AUTO: graph -->",
    "",
    "---",
    "",
    "## Published in this repo",
    "",
    "<!-- BEGIN_AUTO: published -->",
    "",
    "<!-- END_AUTO: published -->",
    "",
    "---",
    "",
    "## Concept Status",
    "",
    "<!-- BEGIN_AUTO: concepts -->",
    "",
    "<!-- END_AUTO: concepts -->",
    "",
    "---",
    "",
    "## What Is Proved",
    "",
    "*Manually curated: claims demonstrated by the published work in this corpus.*",
    "",
    "| Claim | Status | Evidence |",
    "|---|---|---|",
    "| _(add claims here)_ | | |",
    "",
    "---",
    "",
    "## Open Objections",
    "",
    "*Manually curated: objections received publicly, not yet fully resolved.*",
    "",
    "| Objection | Source | Status |",
    "|---|---|---|",
    "| _(add objections here)_ | | |",
    "",
    "---",
    "",
    "## What Remains Possible",
    "",
    "<!-- BEGIN_AUTO: possibilities -->",
    "",
    "<!-- END_AUTO: possibilities -->",
    "",
    "---",
    "",
    "*Generated with `cogentia.js corpus-status` — [scripts/cogentia.js](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/cogentia.js)*",
    "*Challenge via issues. Fork to explore alternatives.*",
    "",
  ].join( "\n" );
}

/** Generate (or refresh) corpus-status.md for one repo. Returns a result object. */
function generateCorpusStatusFor( entry, config, opts ) {
  opts = opts || {};
  const repoPath = resolveRepoPath( entry );
  if ( !repoPath ) return { ok: false, name: entry.name, reason: "not found on disk" };

  const now = new Date();
  const blocks = {
    registered_repos: buildRegisteredReposBlock( config ),
    graph:            buildGraphBlock( config ),
    published:        buildPublishedBlock( repoPath, entry.name ),
    concepts:         buildConceptStatusBlock( repoPath, entry.name ),
    possibilities:    buildPossibilitiesBlock( repoPath ),
  };

  let target  = findCorpusStatusFile( repoPath );
  let bootstrap = false;
  let content;

  if ( target ) {
    content = fs.readFileSync( target, "utf8" );
  } else {
    target    = path.join( repoPath, "research", CORPUS_STATUS_CANONICAL );
    content   = buildCorpusStatusSkeleton( entry, config, now );
    bootstrap = true;
  }

  // Replace each marked section.
  const missing = [];
  for ( const [ id, body ] of Object.entries( blocks ) ) {
    const r = replaceMarkedSection( content, id, body );
    if ( r.updated ) content = r.content;
    else             missing.push( id );
  }

  // Refresh last_modified_at front-matter (best-effort, only if present).
  content = content.replace(
    /^(last_modified_at:\s*).*$/m,
    `$1${fmtDate( now )}`
  );

  const existing = bootstrap ? "" : fs.readFileSync( target, "utf8" );
  const changed  = bootstrap || content !== existing;

  if ( opts.check ) {
    return { ok: true, name: entry.name, target, bootstrap, changed, missing };
  }
  if ( changed ) {
    fs.writeFileSync( target, content, "utf8" );
    appendAudit( {
      command: "corpus-status",
      args:    { repo: entry.name },
      result:  { target, bootstrap, action: bootstrap ? "bootstrapped" : "refreshed" },
      narrative: opts.narrative || null,
    } );
  }
  return { ok: true, name: entry.name, target, bootstrap, changed, missing };
}

// ── Jekyll frontmatter ────────────────────────────────────────────────────────

const FRONTMATTER_SEP = "---";

// Canonical frontmatter schema for the corpus. See `cogentia frontmatter schema`.
const FRONTMATTER_LEVEL_1 = [ "canonical_url", "last_stamped_at" ];
const FRONTMATTER_LEVEL_2_REQUIRED = [ "title", "author", "affiliation", "date", "license", "status" ];
const FRONTMATTER_LEVEL_2_OPTIONAL = [ "subtitle", "version" ];
const FRONTMATTER_LEVEL_3 = {
  jekyll:       [ "description", "layout", "nav_order", "last_modified_at" ],
  multilingual: [ "translations", "lang" ],
  semantics:    [ "role", "related" ],
  alias:        [ "canonical_document", "parent_document" ],
  changelog:    [ "changelog" ],
};
const FRONTMATTER_STATUS_VOCABULARY = [
  "draft", "working-paper", "published", "alias",
  "refreshable", "working-note", "prompt-contract", "journal",
];
const FRONTMATTER_DEPRECATED = [ "canonical_path", "path", "repository", "canonical_project" ];
const FRONTMATTER_AUTO_VIEW_RE = [
  /(?:^|\/)corpus-status\.md$/,
  /(?:^|\/)concepts\.md$/,
  /(?:^|\/)documents\.md$/,
  /(?:^|\/)research\/index\.md$/,
  /(?:^|\/)research\/trails\/[^/]+\.md$/,
];

function isAutoView( relPath ) {
  const p = relPath.replace( /\\/g, "/" );
  return FRONTMATTER_AUTO_VIEW_RE.some( re => re.test( p ) );
}

function parseFrontmatter( content ) {
  const m = content.match( /^---\r?\n([\s\S]*?)\r?\n---/ );
  if ( !m ) return null;
  const fields = {};
  for ( const line of m[ 1 ].split( /\r?\n/ ) ) {
    const km = line.match( /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/ );
    if ( !km ) continue;
    fields[ km[ 1 ] ] = km[ 2 ].trim().replace( /^['"]|['"]$/g, "" );
  }
  return fields;
}

function frontmatterCanonicalStatus( raw ) {
  if ( !raw ) return null;
  // Strip trailing em-dash clauses (U+2014 only — ASCII hyphen stays inside the token).
  const s = raw.replace( /\s*—.*$/, "" ).trim().toLowerCase().replace( /\s+/g, "-" );
  return FRONTMATTER_STATUS_VOCABULARY.includes( s ) ? s : null;
}

function hasFrontmatter( content ) {
  return content.trimStart().startsWith( FRONTMATTER_SEP );
}

function buildFrontmatter( repoName, title ) {
  return [
    "---",
    `title: "${title || ( "Research Index — " + repoName )}"`,
    `description: "A map of what is, what is in progress, and what could be."`,
    `layout: default`,
    `nav_order: 1`,
    `last_modified_at: ${fmtDate( new Date() )}`,
    "---",
    "",
  ].join( "\n" );
}

function ensureFrontmatter( indexPath, repoName ) {
  const content = fs.readFileSync( indexPath, "utf8" );
  if ( hasFrontmatter( content ) ) return false;
  const title = extractTitle( indexPath );
  const fm    = buildFrontmatter( repoName, title );
  fs.writeFileSync( indexPath, fm + content, "utf8" );
  return true;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function ensureIndex( repoPath, repoName ) {
  const researchDir = path.join( repoPath, "research" );
  const indexPath   = path.join( researchDir, "index.md" );
  let researchCreated = false;
  let indexCreated    = false;

  if ( !fs.existsSync( researchDir ) ) {
    fs.mkdirSync( researchDir, { recursive: true } );
    researchCreated = true;
  }

  if ( !fs.existsSync( indexPath ) ) {
    const title   = `Research Index — ${repoName}`;
    const content = [
      buildFrontmatter( repoName, title ),
      `# ${title}`,
      "",
      "*A map of what is, what is in progress, and what could be.*",
      `*See also: [Cogentia Commons](${COGENTIA_INDEX_URL})*`,
      "",
      "---",
      "",
      "## Published",
      "",
      "| Title | Location | Date |",
      "|---|---|---|",
      "",
      "---",
      "",
      "## Referenced",
      "",
      "*Hosted elsewhere, intellectually connected here.*",
      "",
      "| Title | Location |",
      "|---|---|",
      "",
      "---",
      "",
      "## In Progress",
      "",
      "---",
      "",
      "## Open Possibilities",
      "",
      "*Ideas that trotte — no commitment, no deadline.*",
      "",
      "---",
      "",
      "*Priority established by first public commit. License: CC BY-SA 4.0.*",
      "*Fork to explore alternatives. Challenge via issues.*",
    ].join( "\n" );
    fs.writeFileSync( indexPath, content, "utf8" );
    indexCreated = true;
  }

  return { researchCreated, indexCreated };
}

// ── Git operations ────────────────────────────────────────────────────────────

function gitPull( repoPath ) {
  try {
    const result = execSync( "git pull --ff-only", {
      cwd:      repoPath,
      encoding: "utf8",
      timeout:  30000,
    } );
    return { ok: true, output: result.trim() };
  } catch ( e ) {
    return { ok: false, output: e.message.split( "\n" )[ 0 ] };
  }
}

/**
 * Return the upstream tracking ref (e.g. "origin/main") for the given branch,
 * or null if the branch has no upstream configured.
 */
function gitUpstream( repoPath, branch ) {
  if ( !branch ) return null;
  try {
    return execSync( `git rev-parse --abbrev-ref ${branch}@{upstream}`, {
      cwd:      repoPath,
      encoding: "utf8",
      stdio:    [ "ignore", "pipe", "ignore" ],
    } ).trim() || null;
  } catch ( _ ) {
    return null;
  }
}

/**
 * Return { ahead, behind } counts of local branch vs its upstream,
 * computed from cached refs (no network). Caller decides whether to fetch first.
 */
function gitAheadBehind( repoPath, branch, upstream ) {
  if ( !branch || !upstream ) return null;
  try {
    const out = execSync(
      `git rev-list --left-right --count ${branch}...${upstream}`,
      { cwd: repoPath, encoding: "utf8", stdio: [ "ignore", "pipe", "ignore" ] },
    ).trim();
    const parts = out.split( /\s+/ ).map( n => parseInt( n, 10 ) );
    if ( parts.length !== 2 || parts.some( isNaN ) ) return null;
    return { ahead: parts[ 0 ], behind: parts[ 1 ] };
  } catch ( _ ) {
    return null;
  }
}

/**
 * git fetch --quiet (no merge). Returns { ok, output }.
 * Times out at 30s; callers should be ready for network failure.
 */
function gitFetch( repoPath ) {
  try {
    const out = execSync( "git fetch --quiet", {
      cwd:      repoPath,
      encoding: "utf8",
      timeout:  30000,
    } );
    return { ok: true, output: ( out || "" ).trim() };
  } catch ( e ) {
    return { ok: false, output: e.message.split( "\n" )[ 0 ] };
  }
}

function gitCurrentBranch( repoPath ) {
  try {
    return execSync( "git rev-parse --abbrev-ref HEAD", {
      cwd:      repoPath,
      encoding: "utf8",
    } ).trim();
  } catch ( _ ) {
    return "unknown";
  }
}

function gitLastCommit( repoPath ) {
  try {
    return execSync( "git log -1 --format=%ci", {
      cwd:      repoPath,
      encoding: "utf8",
    } ).trim().slice( 0, 10 );
  } catch ( _ ) {
    return null;
  }
}

// ── Document date resolution ──────────────────────────────────────────────────
//
// mtime and "last commit" both get rewritten by automated passes (stamp --all,
// jekyll, etc), so they are unreliable for sorting documents. We resolve dates
// through a tiered fallback that prefers human-authored signals.

const RECENT_WINDOW_DAYS         = 45;
const BULK_COMMIT_FILE_THRESHOLD = 10;
const BULK_COMMIT_SUBJECT_RE     = /\b(stamp|jekyll|frontmatter|canonical|auto[- ]?(stamp|refresh|generate)|bulk)\b/i;

/**
 * Read the first YAML frontmatter and return the human-authored date if any.
 * Honours `date:` then `created:` — NOT `last_stamped_at` / `last_modified_at`,
 * which are rewritten by automation.
 * Returns { date: "YYYY-MM-DD", source: "frontmatter:<key>" } or null.
 */
function extractFrontmatterDate( content ) {
  const m = content.match( /^---\r?\n([\s\S]*?)\r?\n---/ );
  if ( !m ) return null;
  const fm = m[ 1 ];
  for ( const key of [ "date", "created" ] ) {
    const re   = new RegExp( `^${key}\\s*:\\s*(.+?)\\s*$`, "m" );
    const hit  = fm.match( re );
    if ( !hit ) continue;
    const raw  = hit[ 1 ].replace( /^['"]|['"]$/g, "" ).trim();
    const iso  = raw.match( /^(\d{4}-\d{2}-\d{2})/ );
    if ( iso ) return { date: iso[ 1 ], source: `frontmatter:${key}` };
  }
  return null;
}

/**
 * Date of the commit that first introduced a file (follows renames).
 * Returns "YYYY-MM-DD" or null.
 */
function gitFirstCommitDate( repoPath, relPath ) {
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${relPath}"`,
      { cwd: repoPath, encoding: "utf8", timeout: 5000 }
    ).trim();
    if ( !out ) return null;
    const lines = out.split( /\r?\n/ ).filter( Boolean );
    const first = lines[ lines.length - 1 ];
    return first ? first.slice( 0, 10 ) : null;
  } catch ( _ ) {
    return null;
  }
}

/**
 * Date of the most recent commit that touched the file AND is not a "bulk"
 * pass (heuristic: touched more than BULK_COMMIT_FILE_THRESHOLD files, or
 * subject matches BULK_COMMIT_SUBJECT_RE). Falls back to the most recent
 * commit if every candidate was bulk.
 * Returns "YYYY-MM-DD" or null.
 */
function gitLastNonBulkCommitDate( repoPath, relPath ) {
  try {
    const REC = "---COGENTIA-REC---";
    const out = execSync(
      `git log --follow --name-only --format=${REC}%n%aI%n%s -- "${relPath}"`,
      { cwd: repoPath, encoding: "utf8", timeout: 8000, maxBuffer: 16 * 1024 * 1024 }
    );
    if ( !out ) return null;
    const records = out.split( REC ).map( s => s.trim() ).filter( Boolean );
    let fallback = null;
    for ( const rec of records ) {
      const lines    = rec.split( /\r?\n/ );
      const isoDate  = ( lines[ 0 ] || "" ).trim();
      const subject  = ( lines[ 1 ] || "" ).trim();
      const files    = lines.slice( 2 ).filter( Boolean );
      const isoShort = isoDate.slice( 0, 10 );
      if ( !fallback && isoShort ) fallback = isoShort;
      const isBulk   = files.length > BULK_COMMIT_FILE_THRESHOLD
                    || BULK_COMMIT_SUBJECT_RE.test( subject );
      if ( !isBulk && isoShort ) return isoShort;
    }
    return fallback;
  } catch ( _ ) {
    return null;
  }
}

// ── HTTP link check ───────────────────────────────────────────────────────────

function checkUrl( url ) {
  return new Promise( resolve => {
    const mod     = url.startsWith( "https" ) ? https : http;
    const timeout = 8000;
    try {
      const req = mod.request( url, { method: "HEAD", timeout }, res => {
        resolve( { ok: res.statusCode < 400, status: res.statusCode } );
      } );
      req.on( "timeout", () => { req.destroy(); resolve( { ok: false, status: "timeout" } ); } );
      req.on( "error",   () => resolve( { ok: false, status: "error"   } ) );
      req.end();
    } catch ( _ ) {
      resolve( { ok: false, status: "error" } );
    }
  } );
}

// ── GitHub API access ─────────────────────────────────────────────────────────

/**
 * Resolve a GitHub token, in order: --github-token flag → GITHUB_TOKEN env →
 * `gh auth token` if the gh CLI is on PATH → null (anonymous mode, 60 req/h
 * against the public-repo endpoints).
 */
function getGitHubToken() {
  const flagVal = getFlagValue( "--github-token" );
  if ( flagVal ) return flagVal;
  if ( process.env.GITHUB_TOKEN ) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync( "gh auth token", {
      encoding: "utf8",
      timeout:  3000,
      stdio:    [ "ignore", "pipe", "ignore" ],
    } ).trim();
    if ( out ) return out;
  } catch ( _ ) { /* gh missing or not logged in — fall through */ }
  return null;
}

/**
 * GET a JSON endpoint on api.github.com. Returns
 * { status, body, headers, rateLimit: { limit, remaining, reset } }.
 * body is the parsed JSON (or null on parse failure). Does NOT throw on
 * non-2xx — the caller decides what to do with status codes.
 */
function ghFetchJson( url, token ) {
  return new Promise( resolve => {
    const headers = {
      "User-Agent": "cogentia.js",
      "Accept":     "application/vnd.github+json",
    };
    if ( token ) headers.Authorization = `Bearer ${token}`;
    try {
      const req = https.get( url, { headers, timeout: 10000 }, res => {
        let buf = "";
        res.on( "data", c => buf += c );
        res.on( "end", () => {
          let body = null;
          try { body = JSON.parse( buf ); } catch ( _ ) { body = buf; }
          resolve( {
            status:  res.statusCode,
            headers: res.headers,
            body,
            rateLimit: {
              limit:     Number( res.headers[ "x-ratelimit-limit" ]     || 0 ),
              remaining: Number( res.headers[ "x-ratelimit-remaining" ] || 0 ),
              reset:     Number( res.headers[ "x-ratelimit-reset" ]     || 0 ),
            },
          } );
        } );
      } );
      req.on( "timeout", () => { req.destroy(); resolve( { status: 0, body: null, headers: {}, rateLimit: {}, error: "timeout" } ); } );
      req.on( "error",   e  => resolve( { status: 0, body: null, headers: {}, rateLimit: {}, error: e.message } ) );
    } catch ( e ) {
      resolve( { status: 0, body: null, headers: {}, rateLimit: {}, error: e.message } );
    }
  } );
}

// ── Open in editor ────────────────────────────────────────────────────────────

function openFile( filePath ) {
  const editor = process.env.EDITOR || process.env.VISUAL;
  try {
    if ( editor ) {
      execSync( `${editor} "${filePath}"`, { stdio: "inherit" } );
    } else if ( IS_WINDOWS ) {
      execSync( `start "" "${filePath}"`, { shell: true, stdio: "ignore" } );
    } else if ( process.platform === "darwin" ) {
      execSync( `open "${filePath}"`, { stdio: "ignore" } );
    } else {
      execSync( `xdg-open "${filePath}"`, { stdio: "ignore" } );
    }
    return true;
  } catch ( _ ) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

// ── help ──────────────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log( `
${hdr( "cogentia.js" )} — Cogentia Commons CLI
${dim( "Traceable, auditable, AI-connectable knowledge infrastructure." )}

${bold( "Usage:" )}
  node scripts/cogentia.js <command> [args] [--json]

${bold( "Commands:" )}
  ${c.cyan}add${c.reset} <name|path>     Add a repo to the registry
  ${c.cyan}remove${c.reset} <name>       Remove a repo from the registry
  ${c.cyan}list${c.reset}                List registered repos and their status
  ${c.cyan}status${c.reset}              Quick health check across all repos
  ${c.cyan}scan${c.reset}                Full scan — list all markdown, flag unreferenced
  ${c.cyan}init${c.reset} [name]         Bootstrap research/index.md (Jekyll-ready)
  ${c.cyan}ref${c.reset} <file>          Generate a research/index.md entry for a file
  ${c.cyan}open${c.reset} [name]         Open research/index.md in default editor
  ${c.cyan}sync${c.reset}                git pull in all repos
  ${c.cyan}drift${c.reset}               Detect ahead/behind/diverged vs upstream across all repos.
                      Fetches by default; ${c.cyan}--check${c.reset} uses cached refs only.
                      ${c.cyan}--pull${c.reset} fast-forwards behind repos; ${c.cyan}--strict${c.reset} exits non-zero
                      if any repo is behind or diverged.
  ${c.cyan}graph${c.reset}               Generate Mermaid cross-reference graph
  ${c.cyan}check${c.reset}               Validate internal links in all research/index.md
  ${c.cyan}jekyll${c.reset}              Ensure Jekyll frontmatter in all research/index.md
  ${c.cyan}whoami${c.reset}              Print detected GitHub identity + registry location
  ${c.cyan}stamp${c.reset} <file>        Stamp canonical_url into a markdown file's front-matter
  ${c.cyan}stamp${c.reset} --all          Stamp every research-grade .md in every registered repo
                      (use ${c.cyan}--check${c.reset} to preview without writing)
  ${c.cyan}corpus-status${c.reset}        Refresh research/corpus-status.md in every registered repo;
                      auto-generates the structural sections, preserves
                      manually-curated What Is Proved / Open Objections;
                      bootstraps the file if missing. ${c.cyan}<name>${c.reset} for one repo;
                      ${c.cyan}--check${c.reset} for dry-run.
  ${c.cyan}documents${c.reset}            Refresh ${c.cyan}research/documents.md${c.reset} in the registry repo:
                      one consolidated page listing every tracked repo's
                      markdown (after .cogentiaignore), with a reverse-chrono
                      table on activity, a chrono table on authorship, and
                      per-repo anchored replays. ${c.cyan}--check${c.reset} for dry-run.
  ${c.cyan}forks${c.reset} <name>         List GitHub forks of a registered repo (owner, stars,
                      pushed date, URL). Auth resolves ${c.cyan}--github-token${c.reset} →
                      ${c.cyan}GITHUB_TOKEN${c.reset} env → ${c.cyan}gh auth token${c.reset} → anonymous
                      (60 req/h). ${c.cyan}--limit <n>${c.reset} caps page size (max 100).
  ${c.cyan}concepts${c.reset} <sub>       Manage ${c.cyan}research/concepts.md${c.reset} as a typed concept registry.
                      Sub: ${c.cyan}init${c.reset} [repo] | ${c.cyan}list${c.reset} [repo] | ${c.cyan}check${c.reset} [repo] | ${c.cyan}graph${c.reset} [repo]
                           ${c.cyan}ref${c.reset} <concept> [repo] | ${c.cyan}status${c.reset} [repo] | ${c.cyan}schema${c.reset}
  ${c.cyan}manifest${c.reset}            Print the command manifest (OpenAI-compatible tool
                      definitions for every command). Use ${c.cyan}--json${c.reset} for
                      machine consumption by AI agents.
  ${c.cyan}state${c.reset}               Denormalised JSON snapshot of registry + per-repo
                      status + identity (one call replaces list+status+whoami).
  ${c.cyan}explain-ignore${c.reset} <file>  Report whether a file is matched by .cogentiaignore,
                      and which pattern matched.
  ${c.cyan}frontmatter${c.reset} <sub>     Diagnose and harmonise document frontmatter.
                      Sub: ${c.cyan}check${c.reset} [repo] | ${c.cyan}promote${c.reset} <file> | ${c.cyan}promote --batch${c.reset} [--repo <name>] [--check] | ${c.cyan}schema${c.reset}
  ${c.cyan}refresh${c.reset}             Refresh all derived views (corpus-status, backlinks, trails,
                      documents) in canonical order. ${c.cyan}--check${c.reset} for dry-run.
  ${c.cyan}lint${c.reset}                Single-table corpus health report: unreferenced, frontmatter
                      issues, drift, in one pass. Local checks only.
                      ${c.cyan}--strict${c.reset} makes exit code non-zero on any issue.
  ${c.cyan}consolidate${c.reset}         Pre-commit ritual: ${c.cyan}drift${c.reset} + ${c.cyan}lint --strict${c.reset} +
                      ${c.cyan}refresh --check${c.reset} + scheduler items in one pass. Use when
                      you feel the work is "reasonably ready to publish".
  ${c.cyan}links${c.reset}               Convert backtick \`*.md\` references to clickable
                      Markdown links: \`pipeline.md\` → [\`pipeline.md\`](pipeline.md).
                      Default mode: ${c.cyan}--check${c.reset} (preview, no writes).
                      ${c.cyan}--fix${c.reset} to apply. ${c.cyan}--include-headings${c.reset} / ${c.cyan}--include-code${c.reset}
                      to widen scope (off by default). Optional repo name positional.
  ${c.cyan}todo${c.reset} <sub>          Fractal personal scheduler — one ${c.cyan}.cogentia/SCHEDULE.md${c.reset}
                      per scope, aggregated by walking the tree.
                      Sub: ${c.cyan}list${c.reset} (default) | ${c.cyan}add${c.reset} "<title>" | ${c.cyan}done${c.reset} <id> |
                           ${c.cyan}defer${c.reset} <id> [--until <date>] | ${c.cyan}drop${c.reset} <id>
                      ${c.cyan}--global${c.reset} on ${c.cyan}list${c.reset} aggregates all scopes.
  ${c.cyan}next${c.reset}                Apply the scheduler policy and surface the next item(s).
                      ${c.cyan}--global${c.reset}: across all scopes. ${c.cyan}--tag${c.reset} <t>: filter.
                      ${c.cyan}--limit${c.reset} <N>: surface N items. ${c.cyan}--pick${c.reset}: mark items Active.
  ${c.cyan}continuation${c.reset} <sub>   Typed, resumable judgment points (cogentia.continuation.v1).
                      Sub: ${c.cyan}emit${c.reset} <task.json> [--paper <f>|--topic <id>|--from <id>]
                           ${c.cyan}inspect${c.reset} <id>
                           ${c.cyan}resume${c.reset} <id> <step_result.json> [--strict]
                           ${c.cyan}fail${c.reset} <id> <branch-id> --reason "..."
                           ${c.cyan}abort${c.reset} <id> --reason "..."
                           ${c.cyan}queue${c.reset} [--status active|completed|aborted|dormant]
                           ${c.cyan}prioritize${c.reset} <id> [--priority <N>]
                           ${c.cyan}validate${c.reset} <id> [<step_result.json>]
                           ${c.cyan}export${c.reset} <id> [-o <file>] [--bundle]
                           ${c.cyan}log${c.reset} <id>
                           ${c.cyan}prune${c.reset} [--days <N>]
                           ${c.cyan}schema${c.reset}
  ${c.cyan}help${c.reset}                Show this help

${bold( "Global flags:" )}
  ${c.cyan}--registry${c.reset} <path>          Use this .cogentia.json (or its directory).
                              Also honours ${c.cyan}COGENTIA_REGISTRY${c.reset} env var.
  ${c.cyan}--cwd${c.reset} <path>               Change working directory before running.
  ${c.cyan}--narrative-short${c.reset} <text>   Short description; appended to ${AUDIT_DIR}/${AUDIT_FILE}.
  ${c.cyan}--narrative-long${c.reset} <text>    Long description / reasoning.
  ${c.cyan}--chat-url${c.reset} <url>           Conversational-agent session URL (repeatable).
  ${c.cyan}--github-token${c.reset} <token>     GitHub API token. Also honours ${c.cyan}GITHUB_TOKEN${c.reset};
                              falls back to ${c.cyan}gh auth token${c.reset}, then anonymous.
  ${c.cyan}--include-orphans${c.reset}            Mermaid diagrams hide degree-0 nodes by
                              default; this flag restores them.

${bold( "Flags:" )}
  ${c.cyan}--json${c.reset}              Machine-readable JSON output (status, scan, graph)

${bold( "Example workflow:" )}
  node scripts/cogentia.js add ../marenostrum
  node scripts/cogentia.js add ../cogentia
  node scripts/cogentia.js add ../barons-Mariani
  node scripts/cogentia.js add ../FractaVolta
  node scripts/cogentia.js scan
  node scripts/cogentia.js ref some-document.md
  node scripts/cogentia.js graph > corpus-graph.md

${bold( "Config:" )}
  ${CONFIG_FILE} — registry, searched upward from CWD, created on first ${c.cyan}add${c.reset}.

${bold( "Ignore:" )}
  ${IGNORE_FILE} — per-repo, one pattern per line. Patterns without ${c.cyan}/${c.reset} match basename
                   at any depth; patterns with ${c.cyan}/${c.reset} match the full relative path
                   (supports ${c.cyan}*${c.reset} and ${c.cyan}**${c.reset} globs).
                   Built-in defaults: README.md, LICENSE*, TODO.md, CHANGELOG.md,
                   CHANGES.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md.

${dim( "Repository: github.com/JeanHuguesRobert/cogentia" )}
${dim( "License: MIT" )}
` );
}

// ── add ───────────────────────────────────────────────────────────────────────

function cmdAdd( arg ) {
  if ( !arg ) die( "Usage: cogentia add <name|path>" );

  let repoPath, repoName;
  const looksLikePath = arg.includes( path.sep )
    || arg.includes( "/" )
    || arg.startsWith( "." )
    || path.isAbsolute( arg );

  if ( looksLikePath ) {
    repoPath = path.resolve( arg );
    repoName = path.basename( repoPath );
  } else {
    repoName = arg;
    repoPath = findRepoByName( arg, process.cwd() );
    if ( !repoPath ) die( `Repository "${arg}" not found from ${process.cwd()}` );
  }

  if ( !fs.existsSync( repoPath ) ) die( `Path does not exist: ${repoPath}` );
  if ( !isGitRepo( repoPath ) ) die( `${repoPath} is not a git repository (.git not found)` );

  let { configPath, config } = loadConfig();
  if ( !configPath ) {
    configPath = resolveConfigPath( [ repoPath ] );
    if ( !JSON_MODE ) console.log( info( `Creating config at ${configPath}` ) );
  }

  const existing = config.repos.find(
    r => r.name === repoName || r.path === repoPath
  );
  if ( existing ) {
    appendAudit( {
      command: "add",
      args:    { name_or_path: arg },
      result:  { added: repoName, path: existing.path, action: "already_present" },
      narrative: collectNarrative(),
    } );
    if ( JSON_MODE ) {
      console.log( JSON.stringify( { added: repoName, path: existing.path, action: "already_present" }, null, 2 ) );
    } else {
      console.log( warn( `"${repoName}" is already registered (${existing.path})` ) );
    }
    return;
  }

  const branch = gitCurrentBranch( repoPath );
  config.repos.push( { name: repoName, path: repoPath, branch, added: new Date().toISOString() } );
  saveConfig( configPath, config );

  appendAudit( {
    command: "add",
    args:    { name_or_path: arg },
    result:  { added: repoName, path: repoPath, branch, action: "created" },
    narrative: collectNarrative(),
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { added: repoName, path: repoPath, branch, action: "created" }, null, 2 ) );
  } else {
    console.log( ok( `Added "${repoName}" → ${repoPath} (${branch})` ) );
  }
}

// ── remove ────────────────────────────────────────────────────────────────────

function cmdRemove( name ) {
  if ( !name ) die( "Usage: cogentia remove <name>" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No .cogentia.json found. Nothing to remove." );
  const before = config.repos.length;
  config.repos = config.repos.filter( r => r.name !== name );
  if ( config.repos.length === before ) {
    if ( !JSON_MODE ) console.log( warn( `"${name}" not found in registry.` ) );
    return;
  }
  saveConfig( configPath, config );
  appendAudit( {
    command: "remove",
    args:    { name },
    result:  { removed: name },
    narrative: collectNarrative(),
  } );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { removed: name }, null, 2 ) );
  } else {
    console.log( ok( `Removed "${name}" from registry.` ) );
  }
}

// ── list ──────────────────────────────────────────────────────────────────────

function cmdList() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) {
    if ( !JSON_MODE ) console.log( warn( "No repos registered. Use: cogentia add <name|path>" ) );
    else console.log( JSON.stringify( { repos: [] }, null, 2 ) );
    return;
  }

  const result = { configPath, repos: [] };

  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    const found     = !!repoPath;
    const indexPath = found ? path.join( repoPath, "research", "index.md" ) : null;
    const hasIndex  = indexPath && fs.existsSync( indexPath );
    const branch    = found ? gitCurrentBranch( repoPath ) : null;
    const lastCommit = found ? gitLastCommit( repoPath ) : null;

    result.repos.push( { name: entry.name, path: repoPath, found, hasIndex, branch, lastCommit } );
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Registered repositories" )}  ${dim( configPath )}\n` );
  for ( const r of result.repos ) {
    if ( !r.found ) {
      console.log( `  ${fail( r.name )} — not found on disk` );
      continue;
    }
    const idxMark = r.hasIndex ? ok( "research/index.md ✓" ) : warn( "no research/index.md" );
    console.log( `  ${bold( r.name )}  ${dim( r.branch || "" )}  ${dim( r.lastCommit || "" )}` );
    console.log( `    ${dim( r.path )}` );
    console.log( `    ${idxMark}` );
  }
  console.log();
}

// ── status ────────────────────────────────────────────────────────────────────

function cmdStatus() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) {
    if ( !JSON_MODE ) console.log( warn( "No repos registered. Use: cogentia add <name|path>" ) );
    else console.log( JSON.stringify( { repos: [] }, null, 2 ) );
    return;
  }

  const result = { timestamp: fmtNow(), repos: [] };

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) {
      result.repos.push( { name: entry.name, found: false } );
      continue;
    }

    const { indexCreated } = ensureIndex( repoPath, entry.name );
    const indexPath      = path.join( repoPath, "research", "index.md" );
    const indexContent   = fs.readFileSync( indexPath, "utf8" );
    const referenced     = buildReferencedFileSet( indexPath, indexContent );
    const mdFiles        = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
    const ignoredSet     = new Set( ignored.map( f => f.rel ) );
    const unreferenced   = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
      if ( ignoredSet.has( f.rel ) ) return false;
      return !referenced.has( f.full );
    } );

    const branch    = gitCurrentBranch( repoPath );
    const upstream  = gitUpstream( repoPath, branch );
    const drift     = gitAheadBehind( repoPath, branch, upstream );

    result.repos.push( {
      name:              entry.name,
      found:             true,
      branch,
      upstream,
      ahead:             drift ? drift.ahead  : null,
      behind:            drift ? drift.behind : null,
      lastCommit:        gitLastCommit( repoPath ),
      totalMarkdown:     mdFiles.length,
      ignoredCount:      ignored.length,
      unreferencedCount: unreferenced.length,
      indexBootstrapped: indexCreated,
    } );
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Corpus Status" )}  ${dim( result.timestamp )}\n` );
  const W = 20;
  console.log( `  ${dim( pad( "Repository", W ) + "  Branch    Last commit   MD files  Ignored  Unref  Drift" )}` );
  console.log( `  ${dim( "─".repeat( 86 ) )}` );

  for ( const r of result.repos ) {
    if ( !r.found ) {
      console.log( `  ${fail( pad( r.name, W ) )} — not found on disk` );
      continue;
    }
    const unrefColor = r.unreferencedCount > 0 ? c.yellow : c.green;
    const unref      = `${unrefColor}${r.unreferencedCount}${c.reset}`;
    const boot       = r.indexBootstrapped ? ` ${info( "bootstrapped" )}` : "";

    let driftCell;
    if ( !r.upstream )                                  driftCell = dim( "no-upstream" );
    else if ( r.ahead === null || r.behind === null )   driftCell = dim( "—" );
    else if ( r.ahead === 0 && r.behind === 0 )         driftCell = `${c.green}✅${c.reset}`;
    else if ( r.ahead > 0  && r.behind === 0 )          driftCell = `${c.cyan}🔼 ${r.ahead} ahead${c.reset}`;
    else if ( r.ahead === 0 && r.behind > 0 )           driftCell = `${c.yellow}⚠️  ${r.behind} behind${c.reset}`;
    else                                                driftCell = `${c.red}⚡ ${r.ahead}↑/${r.behind}↓ diverged${c.reset}`;

    console.log(
      `  ${bold( pad( r.name, W ) )}  ` +
      `${dim( pad( r.branch || "", 9 ) )}  ` +
      `${dim( r.lastCommit || "         " )}    ` +
      `${pad( r.totalMarkdown, 4, true )}      ` +
      `${dim( pad( r.ignoredCount, 4, true ) )}    ` +
      `${unref}    ` +
      `${driftCell}${boot}`
    );
  }
  console.log( `\n  ${dim( "Drift uses cached refs (no fetch). Run " )}${c.cyan}cogentia drift${c.reset}${dim( " for an up-to-date check." )}\n` );
}

// ── scan ──────────────────────────────────────────────────────────────────────

function cmdScan() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) {
    if ( !JSON_MODE ) console.log( warn( "No repos registered. Use: cogentia add <name|path>" ) );
    else console.log( JSON.stringify( { repos: [] }, null, 2 ) );
    return;
  }

  const result = { timestamp: fmtNow(), repos: [] };

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    const repoResult = { name: entry.name, found: !!repoPath };

    if ( !repoPath ) {
      result.repos.push( repoResult );
      if ( !JSON_MODE ) console.log( `\n${fail( entry.name )} — not found on disk\n` );
      continue;
    }

    const { researchCreated, indexCreated } = ensureIndex( repoPath, entry.name );
    const indexPath      = path.join( repoPath, "research", "index.md" );
    const indexStat      = fs.statSync( indexPath );
    const indexContent   = fs.readFileSync( indexPath, "utf8" );
    const referenced     = buildReferencedFileSet( indexPath, indexContent );
    const mdFiles        = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
    const ignoredSet     = new Set( ignored.map( f => f.rel ) );
    const unreferenced   = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
      if ( ignoredSet.has( f.rel ) ) return false;
      return !referenced.has( f.full );
    } );

    repoResult.path             = repoPath;
    repoResult.branch           = gitCurrentBranch( repoPath );
    repoResult.researchCreated  = researchCreated;
    repoResult.indexCreated     = indexCreated;
    repoResult.indexSize        = indexStat.size;
    repoResult.indexDate        = fmtDate( indexStat.mtime );
    repoResult.files            = mdFiles.map( f => ( {
      rel:   f.rel,
      size:  f.size,
      mtime: fmtDate( f.mtime ),
      referenced: f.rel === "research/index.md" || referenced.has( f.full ),
      ignored:    ignoredSet.has( f.rel ),
    } ) );
    repoResult.ignored          = ignored.map( f => f.rel );
    repoResult.unreferenced     = unreferenced.map( f => f.rel );
    result.repos.push( repoResult );

    if ( JSON_MODE ) continue;

    console.log( `\n${"─".repeat( 64 )}` );
    console.log( `${hdr( entry.name )}  ${dim( repoPath )}  ${dim( repoResult.branch )}` );
    if ( researchCreated ) console.log( info( "Created research/" ) );
    if ( indexCreated    ) console.log( info( "Created research/index.md (bootstrap)" ) );
    console.log( ok( `research/index.md  ${fmtSize( indexStat.size )}  ${fmtDate( indexStat.mtime )}` ) );

    if ( mdFiles.length === 0 ) {
      console.log( warn( "No markdown files found." ) );
      continue;
    }

    const visibleFiles = mdFiles.filter( f => !ignoredSet.has( f.rel ) );
    console.log( `\n${bold( "Markdown files" )} (${visibleFiles.length} active${ignored.length ? `, ${ignored.length} ignored via .cogentiaignore` : ""}, newest first):\n` );
    const W_F = 54, W_S = 7;
    console.log( `  ${dim( pad( "File", W_F ) + "  " + pad( "Size", W_S, true ) + "  Date" )}` );

    for ( const f of visibleFiles ) {
      const isIndex = f.rel === "research/index.md";
      const isRef   = isIndex || referenced.has( f.full );
      const label   = isIndex ? bold( pad( f.rel, W_F ) ) : pad( f.rel, W_F );
      const marker  = isRef ? " " : `${c.yellow}*${c.reset}`;
      console.log( `${marker} ${label}  ${fmtSize( f.size )}  ${fmtDate( f.mtime )}` );
    }

    if ( unreferenced.length > 0 ) {
      console.log( `\n${warn( `${unreferenced.length} file(s) not yet referenced in research/index.md:` )}\n` );
      for ( const f of unreferenced ) {
        console.log( `  ${c.yellow}→${c.reset} ${f.rel}` );
        console.log( `    ${dim( "cogentia ref " + f.rel )}` );
      }
      console.log( `\n${dim( `Tip: add genuinely non-research files to .${IGNORE_FILE} to silence them.` )}` );
    } else {
      console.log( `\n${ok( "All non-ignored markdown files referenced in research/index.md" )}` );
    }
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
  } else {
    console.log();
  }
}

// ── init ──────────────────────────────────────────────────────────────────────

function cmdInit( name ) {
  let repoPath, repoName;

  if ( name ) {
    repoPath = findRepoByName( name, process.cwd() );
    repoName = name;
    if ( !repoPath ) die( `Repository "${name}" not found from ${process.cwd()}` );
  } else {
    let current = path.resolve( process.cwd() );
    while ( true ) {
      if ( isGitRepo( current ) ) { repoPath = current; repoName = path.basename( current ); break; }
      const parent = path.dirname( current );
      if ( parent === current ) break;
      current = parent;
    }
    if ( !repoPath ) die( "Not inside a git repository. Specify a name: cogentia init <name>" );
  }

  const { researchCreated, indexCreated } = ensureIndex( repoPath, repoName );

  appendAudit( {
    command: "init",
    args:    { name: repoName },
    result:  { repo: repoName, researchCreated, indexCreated },
    narrative: collectNarrative(),
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { repo: repoName, researchCreated, indexCreated }, null, 2 ) );
    return;
  }

  if ( researchCreated ) console.log( info( `Created ${repoPath}${path.sep}research${path.sep}` ) );
  if ( indexCreated ) {
    console.log( ok( `Created ${repoPath}${path.sep}research${path.sep}index.md (Jekyll-ready)` ) );
    console.log( info( `See canonical example: ${COGENTIA_INDEX_URL}` ) );
  } else {
    console.log( warn( `research/index.md already exists in "${repoName}" — nothing to do.` ) );
  }
}

// ── ref ───────────────────────────────────────────────────────────────────────

function cmdRef( filePath ) {
  if ( !filePath ) die( "Usage: cogentia ref <file.md>" );

  const absPath = path.resolve( filePath );
  if ( !fs.existsSync( absPath ) ) die( `File not found: ${absPath}` );

  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No .cogentia.json found. Run: cogentia add <repo>" );

  const owner = findOwnerRepo( absPath, config );
  if ( !owner ) die( `File "${absPath}" does not belong to any registered repo.` );

  const { entry, repoPath } = owner;
  const relPath  = path.relative( repoPath, absPath ).replace( /\\/g, "/" );
  const stat     = fs.statSync( absPath );
  const title    = extractTitle( absPath );
  const date     = fmtDate( stat.mtime );

  // Relative path from research/index.md to the file
  const fromIndex  = path.join( repoPath, "research" );
  const relFromIdx = path.relative( fromIndex, absPath ).replace( /\\/g, "/" );

  const tableRow   = `| [${title}](${relFromIdx}) | this repo | ${date} |`;
  const refRow     = `| [${title}](https://github.com/JeanHuguesRobert/${entry.name}/blob/main/${relPath}) | ${entry.name} |`;

  if ( JSON_MODE ) {
    console.log( JSON.stringify( {
      file:       relPath,
      repo:       entry.name,
      title,
      date,
      tableRow,
      refRow,
    }, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Entry for research/index.md" )}\n` );
  console.log( bold( "In the same repo (Published section):" ) );
  console.log( `  ${tableRow}` );
  console.log();
  console.log( bold( "In another repo (Referenced section):" ) );
  console.log( `  ${refRow}` );
  console.log();
  console.log( dim( `File:  ${relPath}` ) );
  console.log( dim( `Title: ${title}` ) );
  console.log( dim( `Date:  ${date}` ) );
  console.log();
}

// ── open ──────────────────────────────────────────────────────────────────────

function cmdOpen( name ) {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  let entry;
  if ( name ) {
    entry = config.repos.find( r => r.name === name );
    if ( !entry ) die( `Repo "${name}" not found in registry.` );
  } else {
    // Find repo containing CWD
    const abs = process.cwd();
    entry = config.repos.find( r => {
      const rp = resolveRepoPath( r );
      return rp && abs.startsWith( rp );
    } );
    if ( !entry ) {
      // Default to first repo
      entry = config.repos[ 0 ];
    }
  }

  const repoPath  = resolveRepoPath( entry );
  if ( !repoPath ) die( `Repo "${entry.name}" not found on disk.` );

  ensureIndex( repoPath, entry.name );
  const indexPath = path.join( repoPath, "research", "index.md" );
  const opened    = openFile( indexPath );

  if ( !JSON_MODE ) {
    if ( opened ) console.log( ok( `Opened ${indexPath}` ) );
    else          console.log( warn( `Could not open editor. Path: ${indexPath}` ) );
  }
}

// ── sync ──────────────────────────────────────────────────────────────────────

function cmdSync() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  const results = [];
  if ( !JSON_MODE ) console.log( `\n${hdr( "Syncing all repos" )}\n` );

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) {
      results.push( { name: entry.name, ok: false, output: "not found on disk" } );
      if ( !JSON_MODE ) console.log( `  ${fail( entry.name )} — not found on disk` );
      continue;
    }
    const branch = gitCurrentBranch( repoPath );
    if ( !JSON_MODE ) process.stdout.write( `  ${bold( pad( entry.name, 20 ) )}  ${dim( branch )}  ` );
    const res = gitPull( repoPath );
    results.push( { name: entry.name, ok: res.ok, output: res.output } );
    if ( !JSON_MODE ) {
      if ( res.ok ) console.log( ok( res.output || "up to date" ) );
      else          console.log( fail( res.output ) );
    }
  }

  if ( JSON_MODE ) console.log( JSON.stringify( { results }, null, 2 ) );
  else console.log();
}

// ── drift ─────────────────────────────────────────────────────────────────────
//
// Detects when local working copies are out of sync with their GitHub upstreams.
// Motivated by sessions where the user edits via GitHub's web UI between local
// runs; without an explicit fetch, `status` reports stale "in sync" because the
// behind count is computed from cached refs.

function cmdDrift() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  const checkOnly  = argv.includes( "--check" );
  const wantPull   = argv.includes( "--pull" );
  const strict     = argv.includes( "--strict" );
  const willFetch  = !checkOnly;

  if ( !JSON_MODE ) {
    const subtitle = checkOnly ? "cached refs only" : ( wantPull ? "fetch + fast-forward pull" : "fetch only" );
    console.log( `\n${hdr( "Corpus drift" )}  ${dim( fmtNow() )}  ${dim( "(" + subtitle + ")" )}\n` );
  }

  const repos = [];
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) {
      repos.push( { name: entry.name, found: false } );
      continue;
    }

    let fetchOutput = null;
    let fetchOk     = null;
    if ( willFetch ) {
      const r = gitFetch( repoPath );
      fetchOk     = r.ok;
      fetchOutput = r.output;
    }

    const branch   = gitCurrentBranch( repoPath );
    const upstream = gitUpstream( repoPath, branch );
    const drift    = gitAheadBehind( repoPath, branch, upstream );

    let state = "unknown";
    if ( !upstream )                                                    state = "no-upstream";
    else if ( !drift )                                                  state = "unknown";
    else if ( drift.ahead === 0 && drift.behind === 0 )                 state = "in-sync";
    else if ( drift.ahead  >  0 && drift.behind === 0 )                 state = "local-ahead";
    else if ( drift.ahead === 0 && drift.behind  >  0 )                 state = "behind";
    else                                                                state = "diverged";

    let pulled    = null;
    if ( wantPull && state === "behind" ) {
      const res = gitPull( repoPath );
      pulled    = { ok: res.ok, output: res.output };
      if ( res.ok ) {
        // Re-read post-pull drift so the report reflects reality.
        const d2 = gitAheadBehind( repoPath, branch, upstream );
        if ( d2 && d2.ahead === 0 && d2.behind === 0 ) state = "in-sync";
      }
    }

    repos.push( {
      name:        entry.name,
      found:       true,
      branch,
      upstream,
      ahead:       drift ? drift.ahead  : null,
      behind:      drift ? drift.behind : null,
      state,
      fetched:     fetchOk,
      fetchOutput,
      pulled,
    } );
  }

  const anyBehind   = repos.some( r => r.state === "behind"   );
  const anyDiverged = repos.some( r => r.state === "diverged" );
  const anyAhead    = repos.some( r => r.state === "local-ahead" );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( {
      timestamp:  fmtNow(),
      checkOnly,
      pull:       wantPull,
      strict,
      anyBehind,
      anyDiverged,
      anyAhead,
      repos,
    }, null, 2 ) );
  } else {
    const W = 20;
    console.log( `  ${dim( pad( "Repository", W ) + "  Branch    Upstream         Ahead  Behind  State" )}` );
    console.log( `  ${dim( "─".repeat( 86 ) )}` );
    for ( const r of repos ) {
      if ( !r.found ) {
        console.log( `  ${fail( pad( r.name, W ) )} — not found on disk` );
        continue;
      }
      let stateCell;
      switch ( r.state ) {
        case "in-sync":     stateCell = `${c.green}✅ in sync${c.reset}`; break;
        case "behind":      stateCell = `${c.yellow}⚠️  behind — \`git pull\` needed${c.reset}`; break;
        case "local-ahead": stateCell = `${c.cyan}🔼 local ahead — \`git push\` pending${c.reset}`; break;
        case "diverged":    stateCell = `${c.red}⚡ diverged — manual merge${c.reset}`; break;
        case "no-upstream": stateCell = `${dim( "no upstream configured" )}`; break;
        default:            stateCell = `${dim( "unknown" )}`;
      }
      if ( r.pulled ) {
        stateCell += r.pulled.ok
          ? ` ${c.green}→ pulled${c.reset}`
          : ` ${c.red}→ pull failed: ${r.pulled.output}${c.reset}`;
      }
      console.log(
        `  ${bold( pad( r.name, W ) )}  ` +
        `${dim( pad( r.branch || "", 9 ) )}  ` +
        `${dim( pad( r.upstream || "—", 14 ) )}  ` +
        `${pad( r.ahead === null ? "—" : r.ahead, 5, true )}  ` +
        `${pad( r.behind === null ? "—" : r.behind, 6, true )}  ` +
        `${stateCell}`
      );
    }
    console.log();
    if ( anyBehind || anyDiverged ) {
      if ( anyDiverged ) console.log( `  ${c.red}One or more repos have diverged. Resolve manually before mutating commands.${c.reset}` );
      if ( anyBehind && !wantPull ) console.log( `  ${dim( "Tip: run " )}${c.cyan}cogentia drift --pull${c.reset}${dim( " to fast-forward the behind repos." )}` );
      console.log();
    }
  }

  appendAudit( {
    command:   "drift",
    args:      { check: checkOnly, pull: wantPull, strict },
    result:    { anyBehind, anyDiverged, anyAhead, repoCount: repos.length },
    narrative: collectNarrative(),
  } );

  if ( strict && ( anyBehind || anyDiverged ) ) {
    process.exitCode = 1;
  }
}

// ── graph ─────────────────────────────────────────────────────────────────────

function cmdGraph() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  const allNames = config.repos.map( r => r.name );
  const edges    = [];
  const nodes    = [];
  const remotes  = new Map();

  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    const indexPath = repoPath ? path.join( repoPath, "research", "index.md" ) : null;
    const hasIndex  = indexPath && fs.existsSync( indexPath );
    const remote    = repoPath ? gitRemoteOwner( repoPath ) : null;
    if ( remote ) remotes.set( entry.name, remote );
    nodes.push( { name: entry.name, hasIndex, found: !!repoPath } );

    if ( hasIndex ) {
      const refs = extractCrossRefs( indexPath, entry.name, allNames );
      for ( const ref of refs ) {
        edges.push( { from: entry.name, to: ref } );
      }
    }
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { nodes, edges }, null, 2 ) );
    return;
  }

  const connected     = nodesWithEdges( edges );
  const showAll       = includeOrphans();
  const visibleNodes  = showAll ? nodes : nodes.filter( n => connected.has( n.name ) );
  const orphans       = nodes.filter( n => !connected.has( n.name ) );

  const lines = [];
  lines.push( "# Cogentia Commons — Corpus Graph" );
  lines.push( "" );
  lines.push( `*Generated: ${fmtNow()}*` );
  lines.push( "" );
  lines.push( "```mermaid" );
  lines.push( "graph LR" );

  for ( const node of visibleNodes ) {
    const label = node.hasIndex
      ? `${node.name}["📄 ${node.name}"]`
      : `${node.name}["⚠️ ${node.name}"]`;
    lines.push( `  ${label}` );
  }

  for ( const edge of edges ) {
    lines.push( `  ${edge.from} --> ${edge.to}` );
  }

  for ( const node of visibleNodes ) {
    const r = remotes.get( node.name );
    if ( r ) lines.push( mermaidClick( node.name, `https://github.com/${r.owner}/${r.repo}/blob/main/research/index.md`, "Open research/index.md" ) );
  }

  lines.push( "```" );
  if ( !showAll && orphans.length > 0 ) {
    lines.push( "" );
    lines.push( `*Orphan repos (no cross-references): ${orphans.map( n => `\`${n.name}\`` ).join( ", " )}. Re-include with \`--include-orphans\`.*` );
  }
  lines.push( "" );
  lines.push( "## Nodes" );
  lines.push( "" );
  lines.push( "| Repository | research/index.md | Links to |" );
  lines.push( "|---|---|---|" );

  for ( const node of nodes ) {
    const repoEdges = edges.filter( e => e.from === node.name ).map( e => e.to ).join( ", " );
    const idxMark   = node.hasIndex ? "✅" : "❌";
    lines.push( `| ${node.name} | ${idxMark} | ${repoEdges || "—"} |` );
  }

  lines.push( "" );
  lines.push( `*${edges.length} cross-reference(s) detected across ${nodes.length} repo(s)${orphans.length && !showAll ? `; ${orphans.length} orphan(s) hidden from diagram` : ""}.*` );

  console.log( lines.join( "\n" ) );
}

// ── check ─────────────────────────────────────────────────────────────────────

async function cmdCheck() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  if ( !JSON_MODE ) console.log( `\n${hdr( "Link check" )}\n` );

  const allResults = [];

  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    if ( !repoPath ) {
      if ( !JSON_MODE ) console.log( fail( `${entry.name} — not found on disk` ) );
      continue;
    }
    const indexPath = path.join( repoPath, "research", "index.md" );
    if ( !fs.existsSync( indexPath ) ) {
      if ( !JSON_MODE ) console.log( warn( `${entry.name} — no research/index.md` ) );
      continue;
    }

    const content = fs.readFileSync( indexPath, "utf8" );
    const links   = extractLinks( content );
    const repoResults = { name: entry.name, links: [] };

    if ( !JSON_MODE ) console.log( bold( entry.name ) );

    for ( const link of links ) {
      const url = link.url;
      let result;

      if ( url.startsWith( "http://" ) || url.startsWith( "https://" ) ) {
        if ( !JSON_MODE ) process.stdout.write( `  ${dim( pad( url.slice( 0, 60 ), 60 ) )}  ` );
        result = await checkUrl( url );
        if ( !JSON_MODE ) {
          console.log( result.ok ? ok( String( result.status ) ) : fail( String( result.status ) ) );
        }
      } else if ( !url.startsWith( "#" ) ) {
        // Internal link — check file existence
        const target  = path.resolve( path.dirname( indexPath ), url.split( "#" )[ 0 ] );
        const exists  = fs.existsSync( target );
        result        = { ok: exists, status: exists ? "found" : "missing" };
        if ( !JSON_MODE ) {
          const label = pad( url.slice( 0, 60 ), 60 );
          console.log( `  ${dim( label )}  ${result.ok ? ok( "found" ) : fail( "missing" )}` );
        }
      } else {
        continue; // skip anchor-only links
      }

      repoResults.links.push( { text: link.text, url, ...result } );
    }

    allResults.push( repoResults );
    if ( !JSON_MODE ) console.log();
  }

  if ( JSON_MODE ) console.log( JSON.stringify( { results: allResults }, null, 2 ) );
}

// ── jekyll ────────────────────────────────────────────────────────────────────

function cmdJekyll() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  if ( !JSON_MODE ) console.log( `\n${hdr( "Jekyll frontmatter check" )}\n` );
  const results = [];

  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    if ( !repoPath ) {
      if ( !JSON_MODE ) console.log( fail( `${entry.name} — not found on disk` ) );
      continue;
    }
    ensureIndex( repoPath, entry.name ); // creates index if missing (already Jekyll-ready)
    const indexPath = path.join( repoPath, "research", "index.md" );
    const added     = ensureFrontmatter( indexPath, entry.name );
    results.push( { name: entry.name, frontmatterAdded: added } );
    if ( !JSON_MODE ) {
      if ( added ) console.log( ok( `${entry.name} — frontmatter added` ) );
      else         console.log( info( `${entry.name} — frontmatter already present` ) );
    }
  }

  if ( JSON_MODE ) console.log( JSON.stringify( { results }, null, 2 ) );
  else console.log();
}

// ── whoami ────────────────────────────────────────────────────────────────────

function cmdWhoami() {
  const { configPath, config } = loadConfig();

  const result = {
    registry: configPath || null,
    repos:    config.repos.length,
    detected: null,
    profile_repo_path: null,
  };

  // Detect from the first registered repo with a github remote.
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const info = gitRemoteOwner( repoPath );
    if ( !info ) continue;
    result.detected = info.owner;
    const profile = detectProfileRepoLocation( repoPath );
    if ( profile ) result.profile_repo_path = profile;
    break;
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Cogentia identity" )}\n` );
  if ( result.registry ) {
    console.log( `  ${bold( "Registry:" )}      ${result.registry}` );
    console.log( `  ${bold( "Repos:" )}         ${result.repos}` );
  } else {
    console.log( `  ${warn( "No registry found. Run: cogentia add <repo>" )}` );
  }
  if ( result.detected ) {
    console.log( `  ${bold( "GitHub user:" )}   ${result.detected}` );
    console.log( `  ${bold( "Profile repo:" )}  ${result.detected}/${result.detected}` );
  }
  if ( result.profile_repo_path ) {
    console.log( `  ${bold( "Local clone:" )}   ${result.profile_repo_path}` );
    if ( result.registry && !result.registry.startsWith( result.profile_repo_path ) ) {
      console.log( `  ${warn( `Registry is not at the profile-repo location — consider moving ${CONFIG_FILE} to ${result.profile_repo_path}` )}` );
    }
  }
  console.log();
}

// ── corpus-status ─────────────────────────────────────────────────────────────

function cmdCorpusStatus( repoArg ) {
  const checkOnly = argv.includes( "--check" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );

  const targets = repoArg
    ? config.repos.filter( r => r.name === repoArg )
    : config.repos;

  if ( targets.length === 0 ) die( `No registered repo matching "${repoArg}".` );

  const narrative = collectNarrative();
  const results   = targets.map( entry => generateCorpusStatusFor( entry, config, { check: checkOnly, narrative } ) );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { results }, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( checkOnly ? "Corpus-status check" : "Corpus-status refresh" )}\n` );
  for ( const r of results ) {
    if ( !r.ok ) { console.log( `  ${fail( r.name )} — ${r.reason}` ); continue; }
    const verb = r.bootstrap ? "bootstrapped" : ( r.changed ? "refreshed" : "unchanged" );
    const tag  = r.bootstrap ? info( "bootstrapped" )
              : r.changed   ? ok( verb )
              : dim( verb );
    console.log( `  ${bold( pad( r.name, 18 ) )}  ${tag}  ${dim( r.target )}` );
    if ( r.missing && r.missing.length > 0 ) {
      console.log( `    ${warn( `markers missing: ${r.missing.join( ", " )} — section not refreshed; add <!-- BEGIN_AUTO: <id> --> / <!-- END_AUTO: <id> --> in the file to enable` )}` );
    }
  }
  console.log();
}

// ── documents ─────────────────────────────────────────────────────────────────

const DOCUMENTS_FILE           = "documents.md";
const DOCUMENTS_OLD_N          = 20;
const DOCUMENTS_OLD_N_PER_REPO = 10;

function repoAnchor( name ) {
  return "repo-" + name.toLowerCase()
    .replace( /[^a-z0-9]+/g, "-" )
    .replace( /^-+|-+$/g, "" );
}

/**
 * Resolve authored + activity dates for a single markdown file.
 * Returns { authored: {date, source}|null, activity: {date, source}|null }.
 *
 * Authored fallback : frontmatter date/created → git first commit → fs mtime.
 * Activity fallback : git last non-bulk commit → fs mtime.
 * The `source` tag is rendered next to the date so the page is self-explanatory.
 */
function resolveDocumentDates( repoPath, relPath, mtime, content ) {
  let authored = extractFrontmatterDate( content );
  if ( !authored ) {
    const first = gitFirstCommitDate( repoPath, relPath );
    if ( first ) authored = { date: first, source: "git:first-commit" };
  }
  if ( !authored && mtime ) authored = { date: fmtDate( mtime ), source: "fs:mtime" };

  let activity = null;
  const last   = gitLastNonBulkCommitDate( repoPath, relPath );
  if ( last ) activity = { date: last, source: "git:last-non-bulk" };
  if ( !activity && mtime ) activity = { date: fmtDate( mtime ), source: "fs:mtime" };

  return { authored, activity };
}

/**
 * Walk every registered repo and build document records, respecting
 * .cogentiaignore (so README/LICENSE/TODO/etc. are excluded by default).
 */
function collectAllDocuments( config ) {
  const docs = [];
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const remote   = gitRemoteOwner( repoPath );
    const branch   = gitCurrentBranch( repoPath );
    const ignore   = loadIgnore( repoPath );
    const mdFiles  = listMarkdown( repoPath );
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignore ) ) continue;
      let content = "";
      try { content = fs.readFileSync( f.full, "utf8" ); } catch ( _ ) {}
      const titleMatch = content.match( /^#\s+(.+)$/m );
      const title      = titleMatch ? titleMatch[ 1 ].trim() : path.basename( f.full, ".md" );
      const { authored, activity } = resolveDocumentDates( repoPath, f.rel, f.mtime, content );
      const githubBlob = remote
        ? `https://github.com/${remote.owner}/${remote.repo}/blob/${branch}/${f.rel}`
        : null;
      const githubEdit = remote
        ? `https://github.com/${remote.owner}/${remote.repo}/edit/${branch}/${f.rel}`
        : null;
      docs.push( {
        repoName: entry.name,
        repoPath,
        relPath:  f.rel,
        full:     f.full,
        title,
        authored,
        activity,
        githubBlob,
        githubEdit,
      } );
    }
  }
  docs.sort( ( a, b ) =>
    ( b.activity?.date || "" ).localeCompare( a.activity?.date || "" )
  );
  return docs;
}

function escCell( s ) {
  return String( s == null ? "" : s ).replace( /\|/g, "\\|" ).replace( /\r?\n/g, " " );
}

function renderActivityRow( d ) {
  const titleCell = d.githubBlob
    ? `[${escCell( d.title )}](${d.githubBlob})`
    : escCell( d.title );
  const editCell  = d.githubEdit ? `[✎](${d.githubEdit})` : "—";
  const act       = d.activity ? `${d.activity.date} <sub>${d.activity.source}</sub>` : "—";
  const aut       = d.authored ? `${d.authored.date} <sub>${d.authored.source}</sub>` : "—";
  return `| ${titleCell} | ${escCell( d.repoName )} | ${act} | ${aut} | \`${escCell( d.relPath )}\` | ${editCell} |`;
}

function renderOldRow( d ) {
  const titleCell = d.githubBlob
    ? `[${escCell( d.title )}](${d.githubBlob})`
    : escCell( d.title );
  const editCell  = d.githubEdit ? `[✎](${d.githubEdit})` : "—";
  const aut       = d.authored ? `${d.authored.date} <sub>${d.authored.source}</sub>` : "—";
  const act       = d.activity ? `${d.activity.date} <sub>${d.activity.source}</sub>` : "—";
  return `| ${titleCell} | ${escCell( d.repoName )} | ${aut} | ${act} | \`${escCell( d.relPath )}\` | ${editCell} |`;
}

const ACTIVITY_TABLE_HEAD = [
  "| Title | Repo | Activity | Authored | Local | Edit |",
  "|---|---|---|---|---|---|",
].join( "\n" );

const OLD_TABLE_HEAD = [
  "| Title | Repo | Authored | Activity | Local | Edit |",
  "|---|---|---|---|---|---|",
].join( "\n" );

function buildDocumentsPage( config, docs, now ) {
  const cutoff    = new Date( now.getTime() - RECENT_WINDOW_DAYS * 86400000 );
  const cutoffStr = fmtDate( cutoff );
  const recent    = docs.filter( d => d.activity && d.activity.date >= cutoffStr );
  const oldSorted = docs
    .filter( d => d.authored )
    .slice()
    .sort( ( a, b ) => a.authored.date.localeCompare( b.authored.date ) );
  const oldest    = oldSorted.slice( 0, DOCUMENTS_OLD_N );

  const byRepo = new Map();
  for ( const d of docs ) {
    if ( !byRepo.has( d.repoName ) ) byRepo.set( d.repoName, [] );
    byRepo.get( d.repoName ).push( d );
  }

  const lines = [];
  lines.push( "---" );
  lines.push( `title: "Documents — All Tracked Repos"` );
  lines.push( `description: "Consolidated list of Markdown documents across registered repositories."` );
  lines.push( "layout: default" );
  lines.push( "nav_order: 3" );
  lines.push( `last_modified_at: ${fmtDate( now )}` );
  lines.push( "---" );
  lines.push( "" );
  lines.push( "# Documents — All Tracked Repos" );
  lines.push( "" );
  lines.push( "*Auto-generated by `cogentia documents`. Do not edit by hand.*" );
  lines.push( "" );
  lines.push( `*Recent-activity window: ${RECENT_WINDOW_DAYS} days (since ${cutoffStr}).*  ` );
  lines.push( `***Activity*** *date: most recent commit, excluding bulk passes (stamp / jekyll / frontmatter / canonical, or commits touching more than ${BULK_COMMIT_FILE_THRESHOLD} files).*  ` );
  lines.push( "***Authored*** *date: `date:` / `created:` from frontmatter, else git creation date, else filesystem mtime.*" );
  lines.push( "" );

  lines.push( "## Overview" );
  lines.push( "" );
  lines.push( `- Tracked repos: **${config.repos.length}**` );
  lines.push( `- Documents (after \`.cogentiaignore\`): **${docs.length}**` );
  lines.push( `- Recent activity (≤ ${RECENT_WINDOW_DAYS}d): **${recent.length}**` );
  lines.push( `- Oldest listed: **${oldest.length}** / ${oldSorted.length}` );
  lines.push( "" );

  lines.push( "## Contents" );
  lines.push( "" );
  lines.push( "- [Recent activity](#recent-activity)" );
  lines.push( `- [Oldest (top ${DOCUMENTS_OLD_N})](#oldest)` );
  lines.push( "- By repository:" );
  for ( const name of Array.from( byRepo.keys() ).sort() ) {
    lines.push( `  - [${name}](#${repoAnchor( name )})` );
  }
  lines.push( "" );
  lines.push( "---" );
  lines.push( "" );

  lines.push( "## Recent activity" );
  lines.push( "" );
  lines.push( `*Reverse-chronological on activity date. ${recent.length} document(s).*` );
  lines.push( "" );
  if ( recent.length === 0 ) {
    lines.push( `_(No document with activity in the last ${RECENT_WINDOW_DAYS} days.)_` );
  } else {
    lines.push( ACTIVITY_TABLE_HEAD );
    for ( const d of recent ) lines.push( renderActivityRow( d ) );
  }
  lines.push( "" );
  lines.push( "---" );
  lines.push( "" );

  lines.push( "## Oldest" );
  lines.push( "" );
  lines.push( `*Chronological on authored date. Top ${DOCUMENTS_OLD_N}.*` );
  lines.push( "" );
  if ( oldest.length === 0 ) {
    lines.push( "_(No document with a known authored date.)_" );
  } else {
    lines.push( OLD_TABLE_HEAD );
    for ( const d of oldest ) lines.push( renderOldRow( d ) );
  }
  lines.push( "" );
  lines.push( "---" );
  lines.push( "" );

  lines.push( "## By repository" );
  lines.push( "" );
  for ( const name of Array.from( byRepo.keys() ).sort() ) {
    const repoDocs   = byRepo.get( name );
    const repoRecent = repoDocs
      .filter( d => d.activity && d.activity.date >= cutoffStr )
      .slice()
      .sort( ( a, b ) => b.activity.date.localeCompare( a.activity.date ) );
    const repoOldest = repoDocs
      .filter( d => d.authored )
      .slice()
      .sort( ( a, b ) => a.authored.date.localeCompare( b.authored.date ) )
      .slice( 0, DOCUMENTS_OLD_N_PER_REPO );

    lines.push( `### <a id="${repoAnchor( name )}"></a>${name}` );
    lines.push( "" );
    lines.push( `*${repoDocs.length} document(s) total.*` );
    lines.push( "" );
    lines.push( `**Recent activity** (≤ ${RECENT_WINDOW_DAYS}d) — ${repoRecent.length}` );
    lines.push( "" );
    if ( repoRecent.length === 0 ) {
      lines.push( "_(nothing in the window)_" );
    } else {
      lines.push( ACTIVITY_TABLE_HEAD );
      for ( const d of repoRecent ) lines.push( renderActivityRow( d ) );
    }
    lines.push( "" );
    lines.push( `**Oldest** (top ${DOCUMENTS_OLD_N_PER_REPO})` );
    lines.push( "" );
    if ( repoOldest.length === 0 ) {
      lines.push( "_(no known authored date)_" );
    } else {
      lines.push( OLD_TABLE_HEAD );
      for ( const d of repoOldest ) lines.push( renderOldRow( d ) );
    }
    lines.push( "" );
    lines.push( "[↑ Contents](#contents)" );
    lines.push( "" );
  }

  lines.push( "---" );
  lines.push( "" );
  lines.push( `*Generated on ${fmtDate( now )} by \`cogentia documents\` — [scripts/cogentia.js](https://github.com/JeanHuguesRobert/cogentia/blob/main/scripts/cogentia.js).*` );
  lines.push( "" );

  return lines.join( "\n" );
}

function cmdDocuments() {
  const checkOnly = argv.includes( "--check" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  if ( config.repos.length === 0 ) die( "No registered repos. Run: cogentia add <repo>." );

  const registryDir = path.dirname( configPath );
  const researchDir = path.join( registryDir, "research" );
  if ( !fs.existsSync( researchDir ) ) fs.mkdirSync( researchDir, { recursive: true } );
  const target = path.join( researchDir, DOCUMENTS_FILE );

  const now      = new Date();
  const docs     = collectAllDocuments( config );
  const content  = buildDocumentsPage( config, docs, now );
  const existing = fs.existsSync( target ) ? fs.readFileSync( target, "utf8" ) : "";
  const changed  = content !== existing;

  if ( JSON_MODE ) {
    if ( !checkOnly && changed ) {
      fs.writeFileSync( target, content, "utf8" );
      appendAudit( {
        command: "documents",
        args:    { check: checkOnly },
        result:  { target, totalDocs: docs.length, action: "refreshed" },
        narrative: collectNarrative(),
      } );
    }
    console.log( JSON.stringify( {
      target,
      changed,
      check:     checkOnly,
      totalDocs: docs.length,
      perRepo:   config.repos.map( r => ( {
        name:  r.name,
        count: docs.filter( d => d.repoName === r.name ).length,
      } ) ),
    }, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( checkOnly ? "Documents check" : "Documents refresh" )}\n` );
  console.log( `  ${bold( "Target" )}      ${dim( target )}` );
  console.log( `  ${bold( "Repos" )}       ${config.repos.length}` );
  console.log( `  ${bold( "Documents" )}   ${docs.length}` );

  if ( checkOnly ) {
    console.log( `  ${bold( "Action" )}      ${changed ? warn( "would update" ) : dim( "unchanged" )}\n` );
    return;
  }
  if ( !changed ) {
    console.log( `  ${bold( "Action" )}      ${dim( "unchanged" )}\n` );
    return;
  }
  fs.writeFileSync( target, content, "utf8" );
  appendAudit( {
    command: "documents",
    args:    {},
    result:  { target, totalDocs: docs.length, action: "refreshed" },
    narrative: collectNarrative(),
  } );
  console.log( `  ${bold( "Action" )}      ${ok( "refreshed" )}\n` );
}

// ── forks ─────────────────────────────────────────────────────────────────────

const FORKS_DEFAULT_LIMIT = 100;
const FORKS_MAX_LIMIT     = 100;

function describeAuthMode( token ) {
  if ( !token ) return "anonymous (60 req/h)";
  if ( getFlagValue( "--github-token" ) ) return "token (flag)";
  if ( process.env.GITHUB_TOKEN )         return "token (env GITHUB_TOKEN)";
  return "token (gh CLI)";
}

async function cmdForks( repoArg ) {
  if ( !repoArg ) die( "Usage: cogentia forks <repo-name>" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );

  const entry = config.repos.find( r => r.name === repoArg );
  if ( !entry ) die( `"${repoArg}" is not in the registry.` );

  const repoPath = resolveRepoPath( entry );
  if ( !repoPath ) die( `"${repoArg}" not found on disk.` );

  const remote = gitRemoteOwner( repoPath );
  if ( !remote ) die( `"${repoArg}" has no usable github.com remote.` );

  const limitArg = parseInt( getFlagValue( "--limit" ), 10 );
  const perPage  = Math.min( Number.isFinite( limitArg ) && limitArg > 0 ? limitArg : FORKS_DEFAULT_LIMIT, FORKS_MAX_LIMIT );
  const token    = getGitHubToken();
  const url      = `https://api.github.com/repos/${remote.owner}/${remote.repo}/forks?per_page=${perPage}&sort=newest`;
  const res      = await ghFetchJson( url, token );

  if ( res.status !== 200 ) {
    const msg = res.error
      ? `network error: ${res.error}`
      : `GitHub API returned ${res.status}` + ( res.body && res.body.message ? ` — ${res.body.message}` : "" );
    die( msg );
  }

  const forks = Array.isArray( res.body ) ? res.body.map( f => ( {
    owner:          f.owner && f.owner.login,
    full_name:      f.full_name,
    html_url:       f.html_url,
    default_branch: f.default_branch,
    stars:          f.stargazers_count,
    pushed_at:      f.pushed_at,
    created_at:     f.created_at,
    private:        f.private,
  } ) ) : [];

  // Newest activity first.
  forks.sort( ( a, b ) => ( b.pushed_at || "" ).localeCompare( a.pushed_at || "" ) );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( {
      repo:      `${remote.owner}/${remote.repo}`,
      authMode:  describeAuthMode( token ),
      rateLimit: res.rateLimit,
      total:     forks.length,
      forks,
    }, null, 2 ) );
    return;
  }

  const auth = describeAuthMode( token );
  const rl   = res.rateLimit;
  const rlSuffix = ( rl && rl.limit )
    ? `  ${dim( `${rl.remaining}/${rl.limit} req remaining` )}`
    : "";

  console.log( `\n${hdr( `Forks of ${remote.owner}/${remote.repo}` )}  ${dim( auth )}${rlSuffix}\n` );

  if ( forks.length === 0 ) {
    console.log( `  ${dim( "(no forks found)" )}\n` );
    return;
  }

  const W_OWNER = 30, W_STARS = 6, W_PUSHED = 10, W_BRANCH = 14;
  console.log( `  ${dim( pad( "Owner", W_OWNER ) + "  " + pad( "Stars", W_STARS, true ) + "  " + pad( "Pushed", W_PUSHED ) + "  " + pad( "Branch", W_BRANCH ) + "  URL" )}` );
  console.log( `  ${dim( "─".repeat( 96 ) )}` );
  for ( const f of forks ) {
    const pushed = ( f.pushed_at || "" ).slice( 0, 10 );
    console.log(
      "  " +
      bold( pad( f.full_name || "?", W_OWNER ) ) + "  " +
      pad( String( f.stars || 0 ), W_STARS, true ) + "  " +
      dim( pad( pushed, W_PUSHED ) ) + "  " +
      dim( pad( f.default_branch || "?", W_BRANCH ) ) + "  " +
      dim( f.html_url || "" )
    );
  }
  console.log();
  if ( forks.length === perPage ) {
    console.log( `  ${warn( `Showing ${perPage} forks (the per-page cap). Use --limit <n> to widen, or raise to multi-page once needed.` )}\n` );
  }
}

// ── stamp ─────────────────────────────────────────────────────────────────────

function cmdStamp( fileArg ) {
  const checkOnly = argv.includes( "--check" );
  const stampAll  = argv.includes( "--all" );

  if ( !stampAll && !fileArg ) {
    die( "Usage: cogentia stamp <file>  |  cogentia stamp --all  [--check]" );
  }

  const narrative = collectNarrative();
  const results   = [];

  if ( stampAll ) {
    const { configPath, config } = loadConfig();
    if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );

    for ( const entry of config.repos ) {
      const repoPath = resolveRepoPath( entry );
      if ( !repoPath ) continue;
      const ignorePatterns = loadIgnore( repoPath );
      const mdFiles        = listMarkdown( repoPath );
      for ( const f of mdFiles ) {
        if ( f.rel === "research/index.md" )                 continue;
        if ( matchesIgnore( f.rel, ignorePatterns ) )        continue;
        const abs = path.join( repoPath, f.rel );
        results.push( stampOne( abs, { check: checkOnly, narrative } ) );
      }
    }
  } else {
    results.push( stampOne( fileArg, { check: checkOnly, narrative } ) );
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { results }, null, 2 ) );
    return;
  }

  const stamped     = results.filter( r => r.ok && r.action === "stamped" );
  const wouldUpdate = results.filter( r => r.ok && r.action === "would-update" );
  const unchanged   = results.filter( r => r.ok && r.action === "unchanged" );
  const failed     = results.filter( r => !r.ok );

  console.log( `\n${hdr( checkOnly ? "Stamp check" : "Stamp" )}\n` );
  for ( const r of stamped ) {
    console.log( `  ${ok( `${r.repo}/${r.file}` )}` );
    console.log( `    ${dim( r.canonicalUrl )}` );
  }
  for ( const r of wouldUpdate ) {
    console.log( `  ${warn( `would update: ${r.repo}/${r.file}` )}` );
    console.log( `    ${dim( r.canonicalUrl )}` );
  }
  for ( const r of failed ) {
    console.log( `  ${fail( `${r.file}` )} — ${r.reason}` );
  }
  console.log(
    `\n  ${dim( `${stamped.length} stamped, ${wouldUpdate.length} would-update, ${unchanged.length} unchanged, ${failed.length} failed` )}`
  );
  console.log();
}


// ═══════════════════════════════════════════════════════════════════════════════
// CONCEPT REGISTRY — research/concepts.md
// ═══════════════════════════════════════════════════════════════════════════════
//
// cogentia.js does not infer semantic truth. It only maintains the structural
// conditions under which a semantic agent can reason safely: declared concepts,
// stable links, scope/status metadata, graphs, checks and audit logs.

const CONCEPTS_CANONICAL = "concepts.md";
const CONCEPTS_BASENAMES = [ "concepts.md", "concept-index.md", "concept_index.md" ];
const CONCEPT_STATUS_VALUES = [ "Seed", "Working", "Defined", "Operational", "Canonical" ];
const CONCEPT_SCOPE_VALUES  = [ "Global", "Barons Mariani", "FractaVolta", "Cogentia", "Mare Nostrum", "C.O.R.S.I.C.A.", "Casa Mariani", "Paese Capable", "Paese Capace", "Project", "Repo-specific" ];

function findConceptsFile( repoPath ) {
  const dir = path.join( repoPath, "research" );
  for ( const base of CONCEPTS_BASENAMES ) {
    const p = path.join( dir, base );
    if ( fs.existsSync( p ) ) return p;
  }
  return null;
}

function conceptsCanonicalPath( repoPath ) {
  return path.join( repoPath, "research", CONCEPTS_CANONICAL );
}

function slugifyMarkdownHeading( s ) {
  return String( s )
    .trim()
    .toLowerCase()
    .normalize( "NFD" ).replace( /[\u0300-\u036f]/g, "" )
    .replace( /[`*_~]/g, "" )
    .replace( /[^a-z0-9\s-]/g, "" )
    .replace( /\s+/g, "-" )
    .replace( /-+/g, "-" )
    .replace( /^-|-$/g, "" );
}

function conceptGraphId( s ) {
  const slug = slugifyMarkdownHeading( s ) || "unnamed";
  return "c_" + slug.replace( /[^a-z0-9_]/g, "_" );
}

function extractBoldField( body, field ) {
  // Accept both **Field:** value and **Field**: value.
  const re = new RegExp( `^\\*\\*${field}\\s*:?\\*\\*\\s*:?\\s*(.+)$`, "im" );
  const m = body.match( re );
  return m ? m[ 1 ].trim() : null;
}

function extractListAfterField( body, field ) {
  const lines = body.split( /\r?\n/ );
  const out = [];
  let inBlock = false;
  // Accept both **Field:** and **Field**: forms.
  const fieldRe = new RegExp( `^\\*\\*${field}\\s*:?\\*\\*\\s*:?\\s*$`, "i" );
  const fieldInlineRe = new RegExp( `^\\*\\*${field}\\s*:?\\*\\*\\s*:?\\s*(.+)$`, "i" );
  for ( const line of lines ) {
    const trimmed = line.trim();
    const inline = trimmed.match( fieldInlineRe );
    if ( inline ) {
      const value = inline[ 1 ].trim();
      if ( value && value !== "—" && !value.startsWith( "- " ) ) {
        out.push( ...value.split( /[,;]/ ).map( x => x.trim() ).filter( Boolean ) );
      }
      inBlock = true;
      continue;
    }
    if ( fieldRe.test( trimmed ) ) { inBlock = true; continue; }
    if ( inBlock ) {
      if ( /^\*\*[^*]+\*\*\s*:/.test( trimmed ) || /^\*\*[^*]+:\*\*/.test( trimmed ) || /^#{2,6}\s+/.test( trimmed ) ) break;
      if ( trimmed.startsWith( "- " ) ) out.push( trimmed.slice( 2 ).trim() );
      else if ( trimmed === "" ) continue;
      else if ( out.length > 0 ) break;
    }
  }
  return [ ...new Set( out ) ];
}

function cleanConceptRef( s ) {
  return String( s )
    .replace( /`/g, "" )
    .replace( /^\[([^\]]+)\]\([^)]+\)$/, "$1" )
    .trim();
}

function parseConceptsMarkdown( content, repoName, filePath ) {
  const lines = content.split( /\r?\n/ );
  const sections = [];
  let current = null;
  for ( const line of lines ) {
    const m = line.match( /^##\s+(.+)$/ );
    if ( m ) {
      if ( current ) sections.push( current );
      current = { name: m[ 1 ].trim(), bodyLines: [] };
      continue;
    }
    if ( current ) current.bodyLines.push( line );
  }
  if ( current ) sections.push( current );

  return sections
    .filter( s => !/^status|scope|template|deprecated|risky|notes$/i.test( s.name ) )
    .map( s => {
      const body = s.bodyLines.join( "\n" ).trim();
      const shortDefinition = ( function() {
        const m = body.match( /\*\*Short definition:\*\*\s*\n+([\s\S]*?)(?:\n\s*\n|\n\*\*|$)/i );
        if ( m ) return m[ 1 ].replace( /\s+/g, " " ).trim();
        const firstPara = body.split( /\n\s*\n/ ).find( p => p.trim() && !p.trim().startsWith( "**" ) );
        return firstPara ? firstPara.replace( /\s+/g, " " ).trim() : null;
      } )();
      return {
        name: s.name,
        slug: slugifyMarkdownHeading( s.name ),
        repo: repoName,
        file: filePath,
        type: extractBoldField( body, "Type" ),
        scope: extractBoldField( body, "Scope" ),
        status: extractBoldField( body, "Status" ),
        short_definition: shortDefinition,
        parents: extractListAfterField( body, "Parent concepts" ).map( cleanConceptRef ),
        children: extractListAfterField( body, "Child concepts" ).map( cleanConceptRef ),
        related: extractListAfterField( body, "Related concepts" ).map( cleanConceptRef ),
        reference_documents: extractListAfterField( body, "Reference documents" ),
        used_in: extractListAfterField( body, "Used in" ),
      };
    } );
}

function loadConceptsForRepo( entry ) {
  const repoPath = resolveRepoPath( entry );
  if ( !repoPath ) return { ok: false, name: entry.name, reason: "not found on disk", concepts: [] };
  const conceptsPath = findConceptsFile( repoPath );
  if ( !conceptsPath ) return { ok: false, name: entry.name, repoPath, reason: "no research/concepts.md", concepts: [] };
  try {
    const content = fs.readFileSync( conceptsPath, "utf8" );
    const rel = path.relative( repoPath, conceptsPath ).replace( /\\/g, "/" );
    return { ok: true, name: entry.name, repoPath, conceptsPath, rel, concepts: parseConceptsMarkdown( content, entry.name, rel ) };
  } catch ( e ) {
    return { ok: false, name: entry.name, repoPath, conceptsPath, reason: e.message, concepts: [] };
  }
}

function loadAllConcepts( config, repoArg ) {
  const targets = repoArg ? config.repos.filter( r => r.name === repoArg ) : config.repos;
  if ( repoArg && targets.length === 0 ) die( `No registered repo matching "${repoArg}".` );
  return targets.map( loadConceptsForRepo );
}

function buildConceptsSkeleton( repoName ) {
  return [
    "---",
    `title: "Concept Index — ${repoName}"`,
    "description: \"Typed concept registry for humans and AI agents; structure only, not semantic authority.\"",
    "layout: default",
    "nav_order: 3",
    `last_modified_at: ${fmtDate( new Date() )}`,
    "---",
    "",
    `# Concept Index — ${repoName}`,
    "",
    "This file maps concepts used across the corpus.",
    "",
    "`cogentia.js` maintains structure, links, scopes, status and graphs. It does not infer semantic truth.",
    "",
    "## Status scale",
    "",
    "- **Seed** — intuition not yet stabilized.",
    "- **Working** — recurring and usable, but still evolving.",
    "- **Defined** — explicit definition exists.",
    "- **Operational** — connected to implementation, protocol, code, governance or legal use.",
    "- **Canonical** — should be treated as a reference concept unless revised.",
    "",
    "---",
    "",
    "## Cogentia",
    "",
    "**Type:** abstract concept / agentivity class",
    "**Scope:** Global",
    "**Status:** Working",
    "",
    "**Short definition:**",
    "Cogentia designates the actual situated agentivity of an entity — physical person, legal person, or AI agent — combining memory, mandate, capabilities, procedures, acts and traces.",
    "",
    "**Parent concepts:**",
    "- Traceable agency",
    "",
    "**Child concepts:**",
    "- Cogentigram",
    "- Operational memory",
    "",
    "**Reference documents:**",
    "- `research/concepts.md`",
    "",
    "**Used in:**",
    "- digital twin work",
    "- AI agent governance",
    "",
    "---",
    "",
    "## Cogentigram",
    "",
    "**Type:** representation / map",
    "**Scope:** Global",
    "**Status:** Working",
    "",
    "**Short definition:**",
    "A cogentigram is a structured, partial, auditable and revisable representation of a Cogentia.",
    "",
    "**Parent concepts:**",
    "- Cogentia",
    "",
    "**Related concepts:**",
    "- Map vs territory",
    "- Operational memory",
    "- Traceable agency",
    "",
  ].join( "\n" );
}

function buildConceptStatusBlock( repoPath, repoName ) {
  const entry = { name: repoName, path: repoPath };
  const loaded = loadConceptsForRepo( entry );
  if ( !loaded.ok ) return "*(no `research/concepts.md` found.)*";
  if ( loaded.concepts.length === 0 ) return "*(no concept entries found in `research/concepts.md`.)*";
  const lines = [
    "| Concept | Scope | Status | Type |",
    "|---|---|---|---|",
  ];
  for ( const concept of loaded.concepts ) {
    const link = `[${concept.name}](./concepts.md#${concept.slug})`;
    lines.push( `| ${link} | ${concept.scope || "—"} | ${concept.status || "—"} | ${concept.type || "—"} |` );
  }
  return lines.join( "\n" );
}

function validateConceptDocumentLinks( loaded, concept ) {
  const warnings = [];
  const docs = [ ...concept.reference_documents, ...concept.used_in ];
  for ( const raw of docs ) {
    const m = String( raw ).match( /`([^`]+)`/ ) || String( raw ).match( /^([^\s]+\.md)(?:\s|$)/ );
    if ( !m ) continue;
    const rel = m[ 1 ];
    if ( rel.startsWith( "http" ) ) continue;
    const full = path.resolve( loaded.repoPath, rel );
    if ( !fs.existsSync( full ) ) warnings.push( `missing linked document for ${concept.name}: ${rel}` );
  }
  return warnings;
}

function conceptCheckResults( loadedResults ) {
  const results = [];
  const byName = new Map();
  for ( const loaded of loadedResults ) {
    for ( const concept of loaded.concepts ) {
      const key = concept.name.toLowerCase();
      if ( !byName.has( key ) ) byName.set( key, [] );
      byName.get( key ).push( concept );
      const slugKey = concept.slug;
      if ( !byName.has( slugKey ) ) byName.set( slugKey, [] );
      byName.get( slugKey ).push( concept );
    }
  }

  for ( const loaded of loadedResults ) {
    const repoResult = { repo: loaded.name, ok: loaded.ok, reason: loaded.reason || null, concepts: [], warnings: [], errors: [] };
    if ( !loaded.ok ) { results.push( repoResult ); continue; }
    for ( const concept of loaded.concepts ) {
      const cRes = { name: concept.name, warnings: [], errors: [] };
      if ( !concept.type ) cRes.warnings.push( "missing Type" );
      if ( !concept.scope ) cRes.warnings.push( "missing Scope" );
      if ( !concept.status ) cRes.warnings.push( "missing Status" );
      if ( concept.status && !CONCEPT_STATUS_VALUES.some( s => concept.status.toLowerCase().includes( s.toLowerCase() ) ) ) {
        cRes.warnings.push( `non-standard Status: ${concept.status}` );
      }
      if ( !concept.short_definition ) cRes.warnings.push( "missing Short definition" );
      cRes.warnings.push( ...validateConceptDocumentLinks( loaded, concept ) );
      for (const p of concept.parents) {
         if (!byName.has(p.toLowerCase()) && !byName.has(slugifyMarkdownHeading(p))) {
            cRes.warnings.push(`orphan reference: Parent '${p}' is not defined in any registered concepts.md`);
         }
      }
      for (const c of concept.children) {
         if (!byName.has(c.toLowerCase()) && !byName.has(slugifyMarkdownHeading(c))) {
            cRes.warnings.push(`orphan reference: Child '${c}' is not defined in any registered concepts.md`);
         }
      }
      for (const rel of concept.related) {
         if (!byName.has(rel.toLowerCase()) && !byName.has(slugifyMarkdownHeading(rel))) {
            cRes.warnings.push(`orphan reference: Related concept '${rel}' is not defined in any registered concepts.md`);
         }
      }
      const same = byName.get( concept.name.toLowerCase() ) || [];
      if ( same.length > 1 ) {
        const repos = same.map( x => x.repo ).join( ", " );
        cRes.warnings.push( `duplicate concept name across repos: ${repos}` );
      }
      if ( concept.scope && /global/i.test( concept.scope ) && loaded.name !== "barons-Mariani" ) {
        cRes.warnings.push( "global concept outside barons-Mariani; prefer defining the canonical entry in barons-Mariani and referencing it here" );
      }
      repoResult.concepts.push( cRes );
      repoResult.warnings.push( ...cRes.warnings.map( w => `${concept.name}: ${w}` ) );
      repoResult.errors.push( ...cRes.errors.map( e => `${concept.name}: ${e}` ) );
    }
    results.push( repoResult );
  }
  return results;
}

function cmdConceptsInit( repoArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const targets = repoArg ? config.repos.filter( r => r.name === repoArg ) : config.repos;
  if ( targets.length === 0 ) die( `No registered repo matching "${repoArg}".` );
  const results = [];
  for ( const entry of targets ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) { results.push( { name: entry.name, ok: false, reason: "not found on disk" } ); continue; }
    const researchDir = path.join( repoPath, "research" );
    if ( !fs.existsSync( researchDir ) ) fs.mkdirSync( researchDir, { recursive: true } );
    const target = conceptsCanonicalPath( repoPath );
    let action = "unchanged";
    if ( !fs.existsSync( target ) ) {
      fs.writeFileSync( target, buildConceptsSkeleton( entry.name ), "utf8" );
      action = "created";
    }

    // Auto-inject links and markers
    let injected = false;
    const indexPath = path.join( researchDir, "index.md" );
    if ( fs.existsSync( indexPath ) ) {
      let content = fs.readFileSync( indexPath, "utf8" );
      if ( !content.includes( "concepts.md)" ) ) {
        content = content.replace( /(^.*\[Corpus Status\]\(corpus-status\.md\).*?\r?\n)/m, "$1| [Concept Index](concepts.md) *(typed concept registry — mapped by `cogentia.js concepts`)* | this repo | refreshable |\n" );
        fs.writeFileSync( indexPath, content, "utf8" );
        injected = true;
      }
    }
    const statusPath = path.join( researchDir, "corpus-status.md" );
    if ( fs.existsSync( statusPath ) ) {
      let content = fs.readFileSync( statusPath, "utf8" );
      if ( !content.includes( "BEGIN_AUTO: concepts" ) ) {
        content = content.replace( /\n## Published/, "\n## Concepts\n\n<!-- BEGIN_AUTO: concepts -->\n<!-- END_AUTO: concepts -->\n\n## Concept Graph\n\n<!-- BEGIN_AUTO: concept_graph -->\n<!-- END_AUTO: concept_graph -->\n\n---\n\n## Published" );
        fs.writeFileSync( statusPath, content, "utf8" );
        injected = true;
      }
    }

    if ( action === "created" || injected ) {
      appendAudit( { command: "concepts.init", args: { repo: entry.name }, result: { target, action: action === "created" ? "created" : "injected" }, narrative: collectNarrative() } );
    }
    results.push( { name: entry.name, ok: true, target, action: action === "created" ? "created" : ( injected ? "injected" : "unchanged" ) } );
  }
  if ( JSON_MODE ) { console.log( JSON.stringify( { results }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Concept registry init" )}\n` );
  for ( const r of results ) {
    if ( !r.ok ) console.log( `  ${fail( r.name )} — ${r.reason}` );
    else {
      const stateStr = r.action === "created" ? ok( "created" ) : ( r.action === "injected" ? ok( "injected" ) : dim( "unchanged" ) );
      console.log( `  ${bold( pad( r.name, 18 ) )} ${stateStr} ${dim( r.target )}` );
    }
  }
  console.log();
}

function cmdConceptsList( repoArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const loaded = loadAllConcepts( config, repoArg );
  const concepts = loaded.flatMap( r => r.concepts );
  if ( JSON_MODE ) { console.log( JSON.stringify( { repos: loaded, concepts }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Concepts" )}\n` );
  for ( const r of loaded ) {
    if ( !r.ok ) { console.log( `  ${fail( r.name )} — ${r.reason}` ); continue; }
    console.log( `  ${bold( r.name )} ${dim( r.rel )}` );
    for ( const concept of r.concepts ) {
      console.log( `    ${c.cyan}${concept.name}${c.reset}  ${dim( `${concept.scope || "—"} / ${concept.status || "—"}` )}` );
    }
  }
  console.log();
}

function cmdConceptsCheck( repoArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const loaded = loadAllConcepts( config, repoArg );
  const results = conceptCheckResults( loaded );
  if ( JSON_MODE ) { console.log( JSON.stringify( { results }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Concept registry check" )}\n` );
  for ( const r of results ) {
    if ( !r.ok ) { console.log( `  ${fail( r.repo )} — ${r.reason}` ); continue; }
    const mark = r.errors.length ? fail( r.repo ) : ( r.warnings.length ? warn( r.repo ) : ok( r.repo ) );
    console.log( `  ${mark}` );
    for ( const w of r.warnings ) console.log( `    ${c.yellow}→${c.reset} ${w}` );
    for ( const e of r.errors ) console.log( `    ${c.red}→${c.reset} ${e}` );
  }
  console.log();
}

function buildConceptGraphBlock(loaded) {
  const nodes = [], edges = [], edgeKeys = new Set();
  function addEdge( fromName, toName, label ) {
    const edge = { from: conceptGraphId( fromName ), to: conceptGraphId( toName ), label };
    const key = `${edge.from}|${edge.to}`;
    if ( edgeKeys.has( key ) ) return;
    edgeKeys.add( key );
    edges.push( edge );
  }
  // Resolve GitHub remote per loaded repo, once.
  const remotes = new Map();
  for ( const r of loaded ) {
    if ( r.repoPath ) {
      const remote = gitRemoteOwner( r.repoPath );
      if ( remote ) remotes.set( r.name, remote );
    }
    for ( const concept of r.concepts ) {
      nodes.push( { id: conceptGraphId( concept.name ), slug: concept.slug, name: concept.name, repo: r.name, scope: concept.scope, status: concept.status } );
      for ( const p of concept.parents ) addEdge( p, concept.name, "parent" );
      for ( const ch of concept.children ) addEdge( concept.name, ch, "child" );
      for ( const rel of concept.related ) addEdge( concept.name, rel, "related" );
    }
  }

  // Dedupe nodes by id. Canonical-repo policy: prefer scope containing
  // "global" (case-insensitive); else keep first-iterated (load order).
  // Edges keep all fan-in/out from every declaration.
  const dedupedById = new Map();
  for ( const n of nodes ) {
    const existing = dedupedById.get( n.id );
    if ( !existing ) { dedupedById.set( n.id, n ); continue; }
    const incomingGlobal = /global/i.test( n.scope || "" );
    const existingGlobal = /global/i.test( existing.scope || "" );
    if ( incomingGlobal && !existingGlobal ) dedupedById.set( n.id, n );
  }
  const dedupedNodes = Array.from( dedupedById.values() );

  const connected = nodesWithEdges( edges );
  const showAll   = includeOrphans();
  const visible   = showAll ? dedupedNodes : dedupedNodes.filter( n => connected.has( n.id ) );
  const orphans   = dedupedNodes.filter( n => !connected.has( n.id ) );

  const lines   = [ "```mermaid", "graph LR" ];
  const nodeIds = new Set( visible.map( n => n.id ) );
  for ( const n of visible ) lines.push( `  ${n.id}["${n.name}"]` );
  for ( const e of edges ) {
    if ( !nodeIds.has( e.from ) ) lines.push( `  ${e.from}["${e.from.replace( /^c_/, "" ).replace( /_/g, " " )}"]` );
    if ( !nodeIds.has( e.to ) )   lines.push( `  ${e.to}["${e.to.replace( /^c_/, "" ).replace( /_/g, " " )}"]` );
    nodeIds.add( e.from ); nodeIds.add( e.to );
    const arrow = e.label === "related" ? "-.->" : "-->";
    lines.push( `  ${e.from} ${arrow} ${e.to}` );
  }
  // Clickable nodes: real (registered) concepts go to their concepts.md#slug.
  for ( const n of visible ) {
    const r = remotes.get( n.repo );
    if ( r && n.slug ) {
      lines.push( mermaidClick( n.id, `https://github.com/${r.owner}/${r.repo}/blob/main/research/concepts.md#${n.slug}`, `Open ${n.name}` ) );
    }
  }
  lines.push( "```" );
  if ( !showAll && orphans.length > 0 ) {
    lines.push( "" );
    lines.push( `*Orphan concepts (no parents / children / related): ${orphans.map( n => `\`${n.name}\` (${n.repo})` ).join( ", " )}. Re-include with \`--include-orphans\`.*` );
  }
  return lines.join( "\n" );
}

function cmdConceptsGraph( repoArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const loaded = loadAllConcepts( config, repoArg );
  if ( JSON_MODE ) {
    const nodes = [], edges = [], edgeKeys = new Set();
    function addEdge( fromName, toName, label ) {
      const edge = { from: conceptGraphId( fromName ), to: conceptGraphId( toName ), label };
      const key = `${edge.from}|${edge.to}`;
      if ( edgeKeys.has( key ) ) return;
      edgeKeys.add( key );
      edges.push( edge );
    }
    for ( const r of loaded ) {
      for ( const concept of r.concepts ) {
        nodes.push( { id: conceptGraphId( concept.name ), slug: concept.slug, name: concept.name, repo: r.name, scope: concept.scope, status: concept.status } );
        for ( const p of concept.parents ) addEdge( p, concept.name, "parent" );
        for ( const ch of concept.children ) addEdge( concept.name, ch, "child" );
        for ( const rel of concept.related ) addEdge( concept.name, rel, "related" );
      }
    }
    console.log( JSON.stringify( { nodes, edges }, null, 2 ) ); return;
  }
  const graphCode = buildConceptGraphBlock(loaded);
  const lines = [ "# Cogentia — Concept Graph", "", `*Generated: ${fmtNow()}*`, "", graphCode ];
  console.log( lines.join( "\n" ) );
}

function cmdConceptsRef( conceptName, repoArg ) {
  if ( !conceptName ) die( "Usage: cogentia concepts ref <concept> [repo]" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const loaded = loadAllConcepts( config, repoArg );
  const matches = loaded.flatMap( r => r.concepts.map( cpt => ( { ...cpt, repoPath: r.repoPath, rel: r.rel } ) ) )
    .filter( cpt => cpt.name.toLowerCase() === conceptName.toLowerCase() || cpt.slug === slugifyMarkdownHeading( conceptName ) );
  if ( matches.length === 0 ) die( `Concept not found: ${conceptName}` );
  const concept = matches[ 0 ];
  const link = `[${concept.name}](${concept.rel || "research/concepts.md"}#${concept.slug})`;
  if ( JSON_MODE ) { console.log( JSON.stringify( { concept, link }, null, 2 ) ); return; }
  console.log( link );
}

function refreshConceptStatusFor( entry, opts ) {
  opts = opts || {};
  const repoPath = resolveRepoPath( entry );
  if ( !repoPath ) return { ok: false, name: entry.name, reason: "not found on disk" };
  const target = findCorpusStatusFile( repoPath );
  if ( !target ) return { ok: false, name: entry.name, reason: "no research/corpus-status.md" };
  const body = buildConceptStatusBlock( repoPath, entry.name );
  const original = fs.readFileSync( target, "utf8" );
  let r = replaceMarkedSection( original, "concepts", body );
  
  if (original.includes("BEGIN_AUTO: concept_graph")) {
    const { config } = loadConfig();
    const loaded = loadAllConcepts(config, null);
    const graphBody = buildConceptGraphBlock(loaded);
    r = replaceMarkedSection(r.content, "concept_graph", graphBody);
  }

  if ( !r.updated ) return { ok: false, name: entry.name, target, reason: "missing concepts auto markers" };
  const changed = r.content !== original;
  if ( opts.check ) return { ok: true, name: entry.name, target, changed };
  if ( changed ) {
    fs.writeFileSync( target, r.content, "utf8" );
    appendAudit( { command: "concepts.status", args: { repo: entry.name }, result: { target, action: "refreshed" }, narrative: collectNarrative() } );
  }
  return { ok: true, name: entry.name, target, changed };
}

function cmdConceptsStatus( repoArg ) {
  const checkOnly = argv.includes( "--check" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const targets = repoArg ? config.repos.filter( r => r.name === repoArg ) : config.repos;
  if ( targets.length === 0 ) die( `No registered repo matching "${repoArg}".` );
  const results = targets.map( entry => refreshConceptStatusFor( entry, { check: checkOnly } ) );
  if ( JSON_MODE ) { console.log( JSON.stringify( { results }, null, 2 ) ); return; }
  console.log( `\n${hdr( checkOnly ? "Concept-status check" : "Concept-status refresh" )}\n` );
  for ( const r of results ) {
    if ( !r.ok ) { console.log( `  ${fail( r.name )} — ${r.reason}` ); continue; }
    console.log( `  ${bold( pad( r.name, 18 ) )} ${r.changed ? ok( "refreshed" ) : dim( "unchanged" )} ${dim( r.target )}` );
  }
  console.log();
}

function cmdConceptsSchema() {
  const schema = {
    file: "research/concepts.md",
    principle: "The CLI validates structure. A human or AI agent interprets semantics.",
    concept_heading: "## Concept name",
    fields: [
      "**Type:** abstract concept / interface / project / protocol / document / agent",
      "**Scope:** Global / repository-specific / project-specific",
      "**Status:** Seed / Working / Defined / Operational / Canonical",
      "**Short definition:** paragraph",
      "**Parent concepts:** bullet list",
      "**Child concepts:** bullet list",
      "**Related concepts:** bullet list",
      "**Reference documents:** bullet list of markdown paths or URLs",
      "**Used in:** bullet list of markdown paths, repos or contexts",
    ],
  };
  if ( JSON_MODE ) { console.log( JSON.stringify( schema, null, 2 ) ); return; }
  console.log( JSON.stringify( schema, null, 2 ) );
}

function cmdConcepts( sub, ...rest ) {
  switch ( sub ) {
    case "init":   cmdConceptsInit(   rest[ 0 ] ); break;
    case "list":   cmdConceptsList(   rest[ 0 ] ); break;
    case "check":  cmdConceptsCheck(  rest[ 0 ] ); break;
    case "graph":  cmdConceptsGraph(  rest[ 0 ] ); break;
    case "ref":    cmdConceptsRef(    rest[ 0 ], rest[ 1 ] ); break;
    case "status": cmdConceptsStatus( rest[ 0 ] ); break;
    case "schema": cmdConceptsSchema(); break;
    case undefined:
      die( "Usage: cogentia concepts <init|list|check|graph|ref|status|schema> ..." );
      break;
    default:
      die( `Unknown concepts subcommand: "${sub}".` );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTINUATION PROTOCOL (tier 1) — cogentia.continuation.v1
// ═══════════════════════════════════════════════════════════════════════════════
//
// Typed, validated, provider-neutral resumption points for the CLI.
// See research/agent_resumable_cli.md for the protocol definition.
//
// Storage: <registry-dir>/.cogentia/continuations/<id>.json. Single directory,
// status field, no file moves (Occam).
//
// Heraclitean follow-up: every resume that closes a continuation (success or
// abort) emits a dormant successor. Backtrack stays inside the same continuation.

const CONTINUATIONS_DIR_NAME = "continuations";
const CONTINUATION_PROTOCOL  = "cogentia.continuation.v1";
const CONTINUATION_AGENT_ANY = "*";
const CONTINUATION_STATUSES  = new Set( [ "active", "completed", "aborted", "dormant" ] );
const STEP_RESULT_STATUSES   = new Set( [ "success", "failed", "aborted", "needs_more_context" ] );

const VALIDATE_STRICT = argv.includes( "--strict" )
  || process.env.COGENTIA_VALIDATE === "strict";

function continuationsDir() {
  const configPath = findConfig( process.cwd() );
  if ( !configPath ) die( `No ${CONFIG_FILE} registry found.` );
  const dir = path.join( path.dirname( configPath ), AUDIT_DIR, CONTINUATIONS_DIR_NAME );
  if ( !fs.existsSync( dir ) ) fs.mkdirSync( dir, { recursive: true } );
  return dir;
}

function continuationPath( id ) {
  return path.join( continuationsDir(), `${id}.json` );
}

function generateContinuationId() {
  const hex = Array.from( { length: 8 }, () =>
    Math.floor( Math.random() * 16 ).toString( 16 ),
  ).join( "" );
  return `ctn_${hex}`;
}

function loadContinuation( id ) {
  const p = continuationPath( id );
  if ( !fs.existsSync( p ) ) die( `Continuation not found: ${id}` );
  try {
    return JSON.parse( fs.readFileSync( p, "utf8" ) );
  } catch ( e ) {
    die( `Cannot parse continuation ${id}: ${e.message}` );
  }
}

function saveContinuation( cnt ) {
  fs.writeFileSync(
    continuationPath( cnt.id ),
    JSON.stringify( cnt, null, 2 ) + "\n",
    "utf8",
  );
}

function listContinuations() {
  const dir = continuationsDir();
  const out = [];
  if ( !fs.existsSync( dir ) ) return out;
  for ( const name of fs.readdirSync( dir ) ) {
    if ( !name.endsWith( ".json" ) ) continue;
    try {
      out.push( JSON.parse( fs.readFileSync( path.join( dir, name ), "utf8" ) ) );
    } catch ( _ ) { /* skip unparseable */ }
  }
  return out;
}

function deriveTopicForRepo( repoName ) {
  return `urn:cop:topic:cogentia/${repoName}`;
}

function deriveTopicForFile( filePath ) {
  const { config } = loadConfig();
  const abs   = path.resolve( filePath );
  const owner = findOwnerRepo( abs, config );
  if ( !owner ) return null;
  const rel  = path.relative( owner.repoPath, abs ).replace( /\\/g, "/" );
  const stem = rel.replace( /\.md$/i, "" );
  return `urn:cop:topic:cogentia/${owner.entry.name}/${stem}`;
}

function defaultTopicFromCwd() {
  const { config } = loadConfig();
  const cwd = path.resolve( process.cwd() );
  for ( const r of config.repos || [] ) {
    if ( cwd === r.path || cwd.startsWith( r.path + path.sep ) ) {
      return deriveTopicForRepo( r.name );
    }
  }
  return "urn:cop:topic:cogentia/_unknown";
}

function resolveTopic( opts ) {
  if ( opts.topic ) return opts.topic;
  if ( opts.paper ) {
    const t = deriveTopicForFile( opts.paper );
    if ( !t ) die( `Cannot derive topic from --paper "${opts.paper}": file is not in any registered repo.` );
    return t;
  }
  if ( opts.from ) return loadContinuation( opts.from ).topicId;
  return defaultTopicFromCwd();
}

function validateContinuationShape( cnt ) {
  const errs = [], warns = [];
  if ( !cnt.id ) errs.push( "missing id" );
  if ( cnt.status !== "dormant" ) {
    if ( !cnt.task )                   errs.push( "missing task" );
    if ( !cnt.context )                errs.push( "missing context" );
    if ( !cnt.expected_result_schema ) errs.push( "missing expected_result_schema" );
  }
  if ( cnt.alternatives ) {
    if ( !Array.isArray( cnt.alternatives ) ) {
      errs.push( "alternatives must be array" );
    } else {
      const seen = new Set();
      for ( const a of cnt.alternatives ) {
        if ( !a.id ) errs.push( "alternative missing id" );
        else if ( seen.has( a.id ) ) errs.push( `duplicate alternative id: ${a.id}` );
        seen.add( a.id );
      }
    }
  }
  if ( !CONTINUATION_STATUSES.has( cnt.status ) ) {
    errs.push( `invalid status: "${cnt.status}" (expected: ${[ ...CONTINUATION_STATUSES ].join( "|" )})` );
  }
  return { errs, warns };
}

function validateStepResultShape( sr, cnt ) {
  const errs = [], warns = [];
  if ( sr.continuation_id !== cnt.id ) {
    errs.push( `continuation_id mismatch: step_result has "${sr.continuation_id}", expected "${cnt.id}"` );
  }
  if ( !STEP_RESULT_STATUSES.has( sr.status ) ) {
    errs.push( `invalid step_result status: "${sr.status}" (expected: ${[ ...STEP_RESULT_STATUSES ].join( "|" )})` );
  }
  if ( cnt.status !== "active" ) {
    errs.push( `continuation is not active (status="${cnt.status}")` );
  }
  if ( sr.status === "success" && Array.isArray( cnt.alternatives ) && cnt.alternatives.length > 0 ) {
    if ( !sr.chosen_alternative ) {
      warns.push( "step_result has no chosen_alternative but the continuation declares alternatives" );
    } else {
      const ids = cnt.alternatives.map( a => a.id );
      if ( !ids.includes( sr.chosen_alternative ) ) {
        errs.push( `chosen_alternative "${sr.chosen_alternative}" not in alternatives [${ids.join( ", " )}]` );
      }
    }
  }
  if ( sr.status === "failed" ) {
    if ( !sr.failed_alternative ) {
      warns.push( "step_result.status=failed but no failed_alternative specified" );
    } else if ( Array.isArray( cnt.alternatives ) ) {
      const ids = cnt.alternatives.map( a => a.id );
      if ( !ids.includes( sr.failed_alternative ) ) {
        errs.push( `failed_alternative "${sr.failed_alternative}" not in alternatives [${ids.join( ", " )}]` );
      }
    }
  }
  if ( sr.status === "success" && cnt.expected_result_schema ) {
    for ( const key of Object.keys( cnt.expected_result_schema ) ) {
      if ( !( key in sr ) ) {
        warns.push( `step_result missing key "${key}" from expected_result_schema` );
      }
    }
  }
  return { errs, warns };
}

function emitDormantSuccessor( predecessor ) {
  const successor = {
    type:        "continuation",
    protocol:    CONTINUATION_PROTOCOL,
    id:          generateContinuationId(),
    topicId:     predecessor.topicId,
    agent:       CONTINUATION_AGENT_ANY,
    predecessor: predecessor.id,
    status:      "dormant",
    createdAt:   new Date().toISOString(),
  };
  saveContinuation( successor );
  appendAudit( {
    command: "continuation.dormant",
    args:    { predecessor: predecessor.id },
    result:  { id: successor.id, topicId: successor.topicId },
    narrative: collectNarrative(),
  } );
  return successor;
}

function applyStepResult( cnt, sr ) {
  if ( sr.status === "success" ) {
    cnt.status      = "completed";
    cnt.step_result = sr;
    cnt.completedAt = new Date().toISOString();
    return { action: "completed" };
  }
  if ( sr.status === "failed" ) {
    if ( !cnt.failed_alternatives ) cnt.failed_alternatives = [];
    cnt.failed_alternatives.push( {
      id:        sr.failed_alternative,
      reason:    sr.reason || "(no reason given)",
      failed_at: new Date().toISOString(),
    } );
    if ( Array.isArray( cnt.alternatives ) ) {
      cnt.alternatives = cnt.alternatives.filter( a => a.id !== sr.failed_alternative );
    }
    return {
      action:                 "backtracked",
      remaining_alternatives: cnt.alternatives ? cnt.alternatives.length : 0,
    };
  }
  if ( sr.status === "aborted" ) {
    cnt.status      = "aborted";
    cnt.step_result = sr;
    cnt.abortedAt   = new Date().toISOString();
    return { action: "aborted" };
  }
  if ( sr.status === "needs_more_context" ) {
    if ( !cnt.context_requests ) cnt.context_requests = [];
    cnt.context_requests.push( {
      reason:   sr.reason || "",
      question: sr.follow_up_question || sr.question || "",
      at:       new Date().toISOString(),
    } );
    return { action: "needs_more_context" };
  }
  return { action: "unknown" };
}

// ── continuation emit ───────────────────────────────────────────────────────

function cmdContinuationEmit( taskFileArg ) {
  if ( !taskFileArg ) {
    die( "Usage: cogentia continuation emit <task.json> [--paper <file>|--topic <id>|--from <id>]" );
  }
  if ( !fs.existsSync( taskFileArg ) ) die( `Task file not found: ${taskFileArg}` );

  let task;
  try {
    task = JSON.parse( fs.readFileSync( taskFileArg, "utf8" ) );
  } catch ( e ) {
    die( `Cannot parse ${taskFileArg}: ${e.message}` );
  }

  const opts = {
    paper: getFlagValue( "--paper" ),
    topic: getFlagValue( "--topic" ),
    from:  getFlagValue( "--from" ),
  };

  if ( opts.from ) {
    const pred = loadContinuation( opts.from );
    if ( pred.status !== "dormant" ) {
      die( `--from ${opts.from} requires a dormant continuation (got status="${pred.status}").` );
    }
    pred.task                   = task.task                   || pred.task;
    pred.context                = task.context                || {};
    if ( Array.isArray( task.alternatives ) && task.alternatives.length ) pred.alternatives = task.alternatives;
    pred.expected_result_schema = task.expected_result_schema || {};
    if ( task.constraints ) pred.constraints = task.constraints;
    pred.status                 = "active";
    pred.activatedAt            = new Date().toISOString();
    pred.resume                 = pred.resume || { command: `node scripts/cogentia.js continuation resume ${pred.id} <step_result.json>` };

    const v = validateContinuationShape( pred );
    if ( v.errs.length ) die( `Invalid activated continuation:\n  ${v.errs.join( "\n  " )}` );
    saveContinuation( pred );

    appendAudit( {
      command: "continuation.emit",
      args:    { task_file: taskFileArg, from: opts.from },
      result:  { id: pred.id, topicId: pred.topicId, action: "activated_dormant" },
      narrative: collectNarrative(),
    } );

    if ( JSON_MODE ) {
      console.log( JSON.stringify( pred, null, 2 ) );
      return;
    }
    console.log( `\n${hdr( "Continuation activated" )}\n` );
    console.log( `  ${bold( "id:" )}        ${pred.id}` );
    console.log( `  ${bold( "task:" )}      ${pred.task}` );
    console.log( `  ${bold( "topicId:" )}   ${pred.topicId}` );
    console.log( `  ${dim( `file: ${continuationPath( pred.id )}` )}` );
    console.log();
    return;
  }

  const topicId = resolveTopic( opts );
  const cnt = {
    type:                   "continuation",
    protocol:               CONTINUATION_PROTOCOL,
    id:                     generateContinuationId(),
    topicId,
    agent:                  CONTINUATION_AGENT_ANY,
    task:                   task.task,
    context:                task.context || {},
    expected_result_schema: task.expected_result_schema || {},
    status:                 "active",
    createdAt:              new Date().toISOString(),
  };
  if ( Array.isArray( task.alternatives ) && task.alternatives.length ) {
    cnt.alternatives = task.alternatives;
  }
  if ( task.constraints ) cnt.constraints = task.constraints;
  cnt.resume = {
    command: `node scripts/cogentia.js continuation resume ${cnt.id} <step_result.json>`,
  };

  const v = validateContinuationShape( cnt );
  for ( const w of v.warns ) console.error( warn( w ) );
  if ( v.errs.length ) die( `Invalid continuation:\n  ${v.errs.join( "\n  " )}` );

  saveContinuation( cnt );

  appendAudit( {
    command: "continuation.emit",
    args:    { task_file: taskFileArg, paper: opts.paper, topic: opts.topic },
    result:  { id: cnt.id, topicId, task: cnt.task },
    narrative: collectNarrative(),
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( cnt, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Continuation emitted" )}\n` );
  console.log( `  ${bold( "id:" )}        ${cnt.id}` );
  console.log( `  ${bold( "task:" )}      ${cnt.task}` );
  console.log( `  ${bold( "topicId:" )}   ${cnt.topicId}` );
  console.log( `  ${bold( "agent:" )}     ${cnt.agent} ${dim( "(any compliant)" )}` );
  if ( cnt.alternatives ) {
    console.log( `  ${bold( "alternatives:" )} ${cnt.alternatives.map( a => a.id ).join( ", " )}` );
  }
  console.log( `  ${dim( `file: ${continuationPath( cnt.id )}` )}` );
  console.log( `\n  ${dim( "Resume with:" )} ${cnt.resume.command}` );
  console.log();
}

// ── continuation inspect ────────────────────────────────────────────────────

function cmdContinuationInspect( idArg ) {
  if ( !idArg ) die( "Usage: cogentia continuation inspect <id>" );
  const cnt = loadContinuation( idArg );
  appendAudit( {
    command: "continuation.inspect",
    args:    { id: cnt.id },
    result:  { status: cnt.status },
    narrative: collectNarrative(),
  } );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( cnt, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( `Continuation ${cnt.id}` )}\n` );
  console.log( `  ${bold( "status:" )}   ${cnt.status}` );
  console.log( `  ${bold( "task:" )}     ${cnt.task || dim( "(dormant)" )}` );
  console.log( `  ${bold( "topicId:" )}  ${cnt.topicId}` );
  console.log( `  ${bold( "agent:" )}    ${cnt.agent}` );
  console.log( `  ${bold( "created:" )}  ${cnt.createdAt}` );
  if ( cnt.predecessor ) console.log( `  ${bold( "predecessor:" )} ${cnt.predecessor}` );
  if ( cnt.successor )   console.log( `  ${bold( "successor:" )}   ${cnt.successor}` );
  if ( cnt.context && Object.keys( cnt.context ).length ) {
    console.log( `\n  ${bold( "context:" )}` );
    for ( const [ k, v ] of Object.entries( cnt.context ) ) {
      console.log( `    ${k}: ${typeof v === "object" ? JSON.stringify( v ) : v}` );
    }
  }
  if ( cnt.alternatives ) {
    console.log( `\n  ${bold( "alternatives:" )}` );
    for ( const a of cnt.alternatives ) {
      console.log( `    ${c.cyan}${a.id}${c.reset}: ${a.description || ""}` );
    }
  }
  if ( cnt.failed_alternatives && cnt.failed_alternatives.length ) {
    console.log( `\n  ${bold( "failed_alternatives:" )}` );
    for ( const f of cnt.failed_alternatives ) {
      console.log( `    ${c.red}${f.id}${c.reset}: ${f.reason || ""} ${dim( "(" + ( f.failed_at || "" ) + ")" )}` );
    }
  }
  if ( cnt.expected_result_schema && Object.keys( cnt.expected_result_schema ).length ) {
    console.log( `\n  ${bold( "expected_result_schema:" )}` );
    for ( const [ k, t ] of Object.entries( cnt.expected_result_schema ) ) {
      console.log( `    ${k}: ${t}` );
    }
  }
  if ( cnt.step_result ) {
    console.log( `\n  ${bold( "step_result:" )}` );
    const lines = JSON.stringify( cnt.step_result, null, 2 ).split( "\n" );
    for ( const l of lines ) console.log( `    ${l}` );
  }
  if ( cnt.resume && cnt.status === "active" ) {
    console.log( `\n  ${dim( "Resume with: " + cnt.resume.command )}` );
  }
  console.log();
}

// ── continuation resume ────────────────────────────────────────────────────

function cmdContinuationResume( idArg, stepResultFileArg ) {
  if ( !idArg || !stepResultFileArg ) {
    die( "Usage: cogentia continuation resume <id> <step_result.json> [--strict]" );
  }
  if ( !fs.existsSync( stepResultFileArg ) ) die( `Step result file not found: ${stepResultFileArg}` );
  let sr;
  try {
    sr = JSON.parse( fs.readFileSync( stepResultFileArg, "utf8" ) );
  } catch ( e ) {
    die( `Cannot parse ${stepResultFileArg}: ${e.message}` );
  }
  if ( !sr.continuation_id ) sr.continuation_id = idArg;
  if ( !sr.type )            sr.type            = "step_result";

  const cnt = loadContinuation( idArg );
  const v = validateStepResultShape( sr, cnt );
  for ( const w of v.warns ) console.error( warn( w ) );
  if ( v.errs.length ) {
    const msg = `Step-result validation failed:\n  ${v.errs.join( "\n  " )}`;
    if ( VALIDATE_STRICT ) die( msg );
    console.error( fail( msg ) );
    console.error( dim( "  (proceeding because --strict is not set)" ) );
  }

  const delta = applyStepResult( cnt, sr );
  saveContinuation( cnt );

  const auditType =
      delta.action === "completed"   ? "continuation.complete"
    : delta.action === "backtracked" ? "continuation.fail"
    : delta.action === "aborted"     ? "continuation.abort"
    :                                  "continuation.resume";

  appendAudit( {
    command: auditType,
    args:    { id: cnt.id, step_result_file: stepResultFileArg },
    result:  { ...delta, status: cnt.status },
    narrative: collectNarrative(),
  } );

  let successor = null;
  if ( delta.action === "completed" || delta.action === "aborted" ) {
    successor = emitDormantSuccessor( cnt );
    cnt.successor = successor.id;
    saveContinuation( cnt );
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { continuation: cnt, successor }, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Continuation resumed" )}\n` );
  console.log( `  ${bold( "id:" )}        ${cnt.id}` );
  console.log( `  ${bold( "action:" )}    ${delta.action}` );
  console.log( `  ${bold( "status:" )}    ${cnt.status}` );
  if ( delta.action === "backtracked" ) {
    console.log( `  ${bold( "remaining:" )} ${delta.remaining_alternatives} alternative(s)` );
    if ( delta.remaining_alternatives === 0 ) {
      console.log( `\n  ${warn( "All alternatives exhausted — consider aborting or revising." )}` );
    }
  }
  if ( successor ) {
    console.log( `\n  ${dim( `Heraclitean successor: ${successor.id} (dormant)` )}` );
    console.log( `  ${dim( `Activate with: cogentia continuation emit <task.json> --from ${successor.id}` )}` );
  }
  console.log();
}

// ── continuation fail ──────────────────────────────────────────────────────

function cmdContinuationFail( idArg, branchIdArg ) {
  if ( !idArg || !branchIdArg ) {
    die( 'Usage: cogentia continuation fail <id> <branch-id> --reason "..."' );
  }
  const reason = getFlagValue( "--reason" ) || "(no reason given)";
  const sr = {
    type:               "step_result",
    continuation_id:    idArg,
    status:             "failed",
    failed_alternative: branchIdArg,
    reason,
  };
  const cnt = loadContinuation( idArg );
  const v = validateStepResultShape( sr, cnt );
  for ( const w of v.warns ) console.error( warn( w ) );
  if ( v.errs.length ) die( `Cannot fail branch:\n  ${v.errs.join( "\n  " )}` );

  const delta = applyStepResult( cnt, sr );
  saveContinuation( cnt );
  appendAudit( {
    command: "continuation.fail",
    args:    { id: cnt.id, branch: branchIdArg, reason },
    result:  { ...delta, status: cnt.status },
    narrative: collectNarrative(),
  } );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { continuation: cnt }, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( "Branch failed" )}\n` );
  console.log( `  ${bold( "id:" )}        ${cnt.id}` );
  console.log( `  ${bold( "branch:" )}    ${branchIdArg}` );
  console.log( `  ${bold( "reason:" )}    ${reason}` );
  console.log( `  ${bold( "remaining:" )} ${delta.remaining_alternatives} alternative(s)` );
  if ( delta.remaining_alternatives === 0 ) {
    console.log( `\n  ${warn( "All alternatives exhausted." )}` );
  }
  console.log();
}

// ── continuation abort ─────────────────────────────────────────────────────

function cmdContinuationAbort( idArg ) {
  if ( !idArg ) die( 'Usage: cogentia continuation abort <id> --reason "..."' );
  const reason = getFlagValue( "--reason" ) || "(no reason given)";
  const sr = {
    type:            "step_result",
    continuation_id: idArg,
    status:          "aborted",
    reason,
  };
  const cnt = loadContinuation( idArg );
  if ( cnt.status !== "active" && cnt.status !== "dormant" ) {
    die( `Cannot abort continuation in status "${cnt.status}".` );
  }
  applyStepResult( cnt, sr );
  saveContinuation( cnt );
  appendAudit( {
    command: "continuation.abort",
    args:    { id: cnt.id, reason },
    result:  { status: cnt.status },
    narrative: collectNarrative(),
  } );
  const successor = emitDormantSuccessor( cnt );
  cnt.successor = successor.id;
  saveContinuation( cnt );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { continuation: cnt, successor }, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( "Continuation aborted" )}\n` );
  console.log( `  ${bold( "id:" )}        ${cnt.id}` );
  console.log( `  ${bold( "reason:" )}    ${reason}` );
  console.log( `  ${dim( `Heraclitean successor: ${successor.id} (dormant)` )}` );
  console.log();
}

// ── continuation queue ─────────────────────────────────────────────────────


function cmdContinuationPrune() {
  const daysArg = getFlagValue("--days") || getFlagValue("--older-than") || "30";
  const days = parseInt(daysArg, 10);
  if (isNaN(days)) die(`Invalid days: ${daysArg}`);

  const statusFilter = getFlagValue("--status");
  const taskFilter = getFlagValue("--task");
  const apply = !!getFlagValue("--apply");
  const force = !!getFlagValue("--force");
  const mechanicalOnly = !!getFlagValue("--mechanical");

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const all = listContinuations();

  let candidates = all.filter(c => {
    const ageOk = (c.createdAt || c.abortedAt || "") < cutoff;
    const statusOk = !statusFilter || statusFilter.split(",").map(s => s.trim()).includes(c.status);
    const taskOk = !taskFilter || (c.task && c.task.toLowerCase().includes(taskFilter.toLowerCase()));
    return ageOk && statusOk && taskOk;
  });

  candidates = candidates.filter(c => ["dormant", "aborted", "active"].includes(c.status));

  if (candidates.length === 0) {
    console.log("No continuations match the prune criteria.");
    return;
  }

  // === Split into mechanical (safe to auto-act) vs needs judgment ===
  const mechanical = [];
  const needsJudgment = [];

  for (const c of candidates) {
    const isObvious =
      c.status === "aborted" ||
      (c.status === "dormant" && (!c.task || c.task.trim() === "" || c.task.toLowerCase().includes("test"))) ||
      (c.status === "dormant" && (c.createdAt || "") < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() && (!c.priority || c.priority === 0));

    if (isObvious) {
      mechanical.push(c);
    } else {
      needsJudgment.push(c);
    }
  }

  // Dry-run mode (default)
  if (!apply) {
    console.log(`\n${hdr("Continuation Prune (DRY-RUN)")}\n`);
    console.log(`Found ${candidates.length} candidates older than ${days} days.`);
    console.log(`  Mechanical / safe to delete : ${mechanical.length}`);
    console.log(`  Needs external judgment     : ${needsJudgment.length}\n`);

    if (mechanical.length > 0) {
      console.log("Mechanical candidates (would be deleted with --apply --mechanical):");
      mechanical.slice(0, 15).forEach(c => {
        const age = c.createdAt ? c.createdAt.substring(0,10) : "?";
        console.log(`  ${c.id}  [${c.status}]  ${c.task || "(no task)"}  ${age}`);
      });
      if (mechanical.length > 15) console.log(`  ... +${mechanical.length - 15} more`);
    }

    if (needsJudgment.length > 0) {
      console.log("\nNeeds judgment (would emit continuation(s) for external decision):");
      needsJudgment.slice(0, 10).forEach(c => {
        const age = c.createdAt ? c.createdAt.substring(0,10) : "?";
        console.log(`  ${c.id}  [${c.status}]  ${c.task || "(no task)"}  ${age}`);
      });
      if (needsJudgment.length > 10) console.log(`  ... +${needsJudgment.length - 10} more`);
    }

    console.log("\nUsage examples:");
    console.log("  --apply --mechanical     → only delete the obvious/safe ones");
    console.log("  --apply                  → delete mechanical + emit judgment continuations for the rest");
    return;
  }

  // === APPLY mode ===
  let pruned = 0;
  let emitted = 0;

  // 1. Always safe to delete mechanical ones
  for (const c of mechanical) {
    try {
      fs.unlinkSync(continuationPath(c.id));
      pruned++;
    } catch (e) {
      console.error(`Failed to delete ${c.id}: ${e.message}`);
    }
  }

  // 2. For needsJudgment: either delete everything (if --mechanical was not used? no) or emit continuation
  if (needsJudgment.length > 0) {
    if (mechanicalOnly) {
      // User explicitly asked only for mechanical cleanup
      console.log(`--mechanical requested: skipping ${needsJudgment.length} judgment cases.`);
    } else {
      // Emit a judgment continuation for the ambiguous cases
      const pruneTask = {
        type: "continuation",
        protocol: CONTINUATION_PROTOCOL,
        id: generateContinuationId(),
        task: "prune_continuation_judgment",
        status: "active",
        createdAt: new Date().toISOString(),
        context: {
          criteria: {
            older_than_days: days,
            status: statusFilter,
            task_contains: taskFilter,
          },
          mechanical_pruned: mechanical.map(c => c.id),
          candidates: needsJudgment.map(c => ({
            id: c.id,
            task: c.task,
            status: c.status,
            createdAt: c.createdAt,
            topicId: c.topicId,
          })),
          note: "These continuations matched the prune filter but require human/agent judgment before deletion."
        },
      };

      try {
        saveContinuation(pruneTask);
        emitted++;
        console.log(`\nEmitted judgment continuation: ${pruneTask.id}`);
        console.log(`  Task: prune_continuation_judgment`);
        console.log(`  ${needsJudgment.length} candidates listed for review.`);
      } catch (e) {
        console.error("Failed to emit prune judgment continuation:", e.message);
      }
    }
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({ pruned, emitted_judgment: emitted, mechanical: mechanical.length, judgment: needsJudgment.length }, null, 2));
    return;
  }

  console.log(`\n${hdr("Continuation Prune - Applied")}\n`);
  console.log(`  Mechanical deletions : ${pruned}`);
  console.log(`  Judgment continuations emitted : ${emitted}`);
  console.log();
}

/**
 * Petit helper : permet à un agent d'interroger l'humain sur une continuation existante
 * (pertinence, priorité, archive/suppression).
 */
function cmdContinuationConsult( idArg ) {
  if (!idArg) {
    die("Usage: cogentia continuation consult <id> [--question \"...\"]");
  }

  const target = loadContinuation(idArg);
  const customQuestion = getFlagValue("--question");

  // Default prompt is deliberately written to guide an AI agent to do real analysis first
  const defaultAnalysisPrompt = 
    "You are a careful analyst of this corpus and its ongoing work. " +
    "Review the target continuation in detail. Consider its age, its task description, " +
    "its topic, any available context, and the broader state of the projects it relates to. " +
    "Do not give a superficial answer. " +
    "Evaluate its current relevance and potential future value. " +
    "Then propose the single most appropriate decision, with clear reasoning and any important nuances.";

  const question = customQuestion || defaultAnalysisPrompt;

  const newConsultId = generateContinuationId();
  const consult = {
    type: "continuation",
    protocol: CONTINUATION_PROTOCOL,
    id: generateContinuationId(),
    task: "human_judgment_on_continuation",
    status: "active",
    createdAt: new Date().toISOString(),
    context: {
      target_continuation: {
        id: target.id,
        task: target.task,
        status: target.status,
        createdAt: target.createdAt,
        topicId: target.topicId,
        priority: target.priority || 0,
      },
      question,
      // Explicit, strong instructions for AI agents to perform real analysis
      analysis_instructions: 
        "You are a thoughtful analyst familiar with this corpus. " +
        "Carefully examine the target continuation, its history, its task, and its relationships to current work. " +
        "Only after genuine analysis should you propose a decision. " +
        "If the situation is ambiguous or trade-offs exist, explicitly discuss them and state what additional information would help the human decide. " +
        "Your goal is to reduce uncertainty for the human with reasoning, not to guess quickly or look decisive."
    },
    alternatives: [
      { id: "keep", description: "The continuation remains active and relevant for ongoing or future work." },
      { id: "archive", description: "Move it out of the active queue while preserving the full record for later reference." },
      { id: "delete", description: "Permanently remove it — it no longer serves any useful purpose." },
      { id: "postpone", description: "Keep it dormant but schedule an automatic re-review at a later date." }
    ],
    expected_result_schema: {
      decision: "keep | archive | delete | postpone",
      priority: "number (0-100)",
      reason: "string (clear, evidence-based justification — required)",
      nuances: "string (important subtleties, risks, or trade-offs — strongly encouraged for AI)",
      follow_up: "string (specific additional context or questions that would help the human decide — optional but useful when uncertain)"
    },
    resume: {
      command: `node scripts/cogentia.js continuation resume ${newConsultId} <step_result.json>`
    }
  };

  saveContinuation(consult);

  if (JSON_MODE) {
    console.log(JSON.stringify(consult, null, 2));
    return;
  }

  console.log(`\n${hdr("Human consultation requested")}\n`);
  console.log(`  New continuation id : ${consult.id}`);
  console.log(`  Target              : ${target.id}  [${target.status}]`);
  console.log(`  Task                : ${target.task || "(no task)"}`);
  console.log(`  Question / Guidance : ${question}`);
  console.log(`\n  The emitted continuation contains strong analysis instructions for an AI agent.`);
  console.log(`\n  Resume with:`);
  console.log(`    node scripts/cogentia.js continuation resume ${consult.id} <step_result.json>\n`);
}

function cmdContinuationQueue() {
  const filterStatus = getFlagValue( "--status" );
  const all = listContinuations();
  const filtered = filterStatus
    ? all.filter( cnt => cnt.status === filterStatus )
    : all;
  // Sort: higher priority first, then older createdAt first.
  filtered.sort( ( a, b ) => {
    const pa = a.priority || 0;
    const pb = b.priority || 0;
    if ( pa !== pb ) return pb - pa;
    return ( a.createdAt || "" ).localeCompare( b.createdAt || "" );
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( filtered, null, 2 ) );
    return;
  }
  const anyPriority = filtered.some( cnt => ( cnt.priority || 0 ) !== 0 );
  console.log( `\n${hdr( "Continuation queue" )}  ${dim( filterStatus ? `(status=${filterStatus})` : "(all)" )}\n` );
  if ( filtered.length === 0 ) {
    console.log( `  ${dim( "No continuations match." )}\n` );
    return;
  }
  const header = anyPriority
    ? pad( "id", 16 ) + pad( "pri", 6 ) + pad( "status", 12 ) + pad( "task", 32 ) + "topic"
    : pad( "id", 16 ) + pad( "status", 12 ) + pad( "task", 32 ) + "topic";
  console.log( `  ${dim( header )}` );
  for ( const cnt of filtered ) {
    const colorStart =
        cnt.status === "active"    ? c.cyan
      : cnt.status === "completed" ? c.green
      : cnt.status === "aborted"   ? c.red
      : cnt.status === "dormant"   ? c.dim
      :                              "";
    const priCell = anyPriority ? pad( String( cnt.priority || 0 ), 6 ) : "";
    console.log(
      "  " + pad( cnt.id, 16 ) +
      priCell +
      colorStart + pad( cnt.status, 12 ) + c.reset +
      pad( cnt.task || "(dormant)", 32 ) +
      ( cnt.topicId || "" ),
    );
  }
  console.log();
}

// ── continuation prioritize ─────────────────────────────────────────────────

function cmdContinuationPrioritize( idArg ) {
  if ( !idArg ) die( "Usage: cogentia continuation prioritize <id> [--priority <N>]" );
  const cnt = loadContinuation( idArg );
  const priorityArg = getFlagValue( "--priority" );
  if ( priorityArg === null ) {
    // No --priority: report current priority.
    appendAudit( {
      command: "continuation.prioritize.read",
      args:    { id: cnt.id },
      result:  { priority: cnt.priority || 0, status: cnt.status },
      narrative: collectNarrative(),
    } );
    if ( JSON_MODE ) {
      console.log( JSON.stringify( { id: cnt.id, priority: cnt.priority || 0, status: cnt.status }, null, 2 ) );
      return;
    }
    console.log( `\n${hdr( `Continuation ${cnt.id}` )}\n` );
    console.log( `  ${bold( "priority:" )} ${cnt.priority || 0}` );
    console.log( `  ${bold( "status:" )}   ${cnt.status}` );
    console.log( `  ${dim( "Use --priority <integer> to change. Higher priority sorts first in queue." )}\n` );
    return;
  }
  const priority = parseInt( priorityArg, 10 );
  if ( isNaN( priority ) ) die( `Invalid priority: "${priorityArg}" (expected integer)` );
  const old = cnt.priority || 0;
  cnt.priority = priority;
  saveContinuation( cnt );
  appendAudit( {
    command: "continuation.prioritize",
    args:    { id: cnt.id, old, new: priority },
    result:  { status: cnt.status, priority },
    narrative: collectNarrative(),
  } );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { id: cnt.id, priority, previous: old, status: cnt.status }, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( "Continuation prioritized" )}\n` );
  console.log( `  ${bold( "id:" )}       ${cnt.id}` );
  console.log( `  ${bold( "priority:" )} ${old} → ${c.cyan}${priority}${c.reset}` );
  console.log( `  ${bold( "status:" )}   ${cnt.status}` );
  console.log();
}

// ── continuation validate ──────────────────────────────────────────────────

function cmdContinuationValidate( idArg, stepResultFileArg ) {
  if ( !idArg ) die( "Usage: cogentia continuation validate <id> [step_result.json]" );
  const cnt = loadContinuation( idArg );
  const cntCheck = validateContinuationShape( cnt );
  let srCheck = null;
  if ( stepResultFileArg ) {
    let sr;
    try { sr = JSON.parse( fs.readFileSync( stepResultFileArg, "utf8" ) ); }
    catch ( e ) { die( `Cannot read ${stepResultFileArg}: ${e.message}` ); }
    if ( !sr.continuation_id ) sr.continuation_id = idArg;
    srCheck = validateStepResultShape( sr, cnt );
  }
  const valid = cntCheck.errs.length === 0 && ( !srCheck || srCheck.errs.length === 0 );
  appendAudit( {
    command: "continuation.validate",
    args:    { id: cnt.id, step_result_file: stepResultFileArg || null },
    result:  {
      valid,
      continuation_errs: cntCheck.errs.length,
      continuation_warns: cntCheck.warns.length,
      step_result_errs: srCheck ? srCheck.errs.length : null,
      step_result_warns: srCheck ? srCheck.warns.length : null,
    },
    narrative: collectNarrative(),
  } );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( {
      id: cnt.id,
      status: cnt.status,
      valid,
      continuation: cntCheck,
      step_result: srCheck,
    }, null, 2 ) );
    if ( !valid ) process.exit( 1 );
    return;
  }
  console.log( `\n${hdr( `Validate ${cnt.id}` )}\n` );
  const fmt = ( label, check ) => {
    const status = check.errs.length ? `${c.red}INVALID${c.reset}` : `${c.green}OK${c.reset}`;
    console.log( `  ${bold( label + ":" )} ${status}  ${dim( `(${check.errs.length} err, ${check.warns.length} warn)` )}` );
    for ( const e of check.errs )  console.log( `    ${c.red}✗${c.reset} ${e}` );
    for ( const w of check.warns ) console.log( `    ${c.yellow}⚠${c.reset} ${w}` );
  };
  fmt( "Continuation", cntCheck );
  if ( srCheck ) fmt( "Step result", srCheck );
  console.log();
  if ( !valid ) process.exit( 1 );
}

// ── continuation export ────────────────────────────────────────────────────

function cmdContinuationExport( idArg ) {
  if ( !idArg ) die( "Usage: cogentia continuation export <id> [-o <file>] [--bundle]" );
  const cnt = loadContinuation( idArg );
  const outFile = getFlagValue( "-o" ) || getFlagValue( "--output" );
  const bundle  = process.argv.includes( "--bundle" );

  let payload;
  if ( bundle ) {
    const chain = { continuation: cnt };
    if ( cnt.predecessor ) {
      try { chain.predecessor = loadContinuation( cnt.predecessor ); }
      catch ( _ ) { chain.predecessor = { id: cnt.predecessor, note: "not found locally" }; }
    }
    if ( cnt.successor ) {
      try { chain.successor = loadContinuation( cnt.successor ); }
      catch ( _ ) { chain.successor = { id: cnt.successor, note: "not found locally" }; }
    }
    payload = chain;
  } else {
    payload = cnt;
  }

  const json = JSON.stringify( payload, null, 2 );
  appendAudit( {
    command: "continuation.export",
    args:    { id: cnt.id, bundle, output: outFile || null },
    result:  { status: cnt.status, bytes: Buffer.byteLength( json, "utf8" ) },
    narrative: collectNarrative(),
  } );
  if ( outFile ) {
    fs.writeFileSync( outFile, json + "\n", "utf8" );
    if ( !JSON_MODE ) {
      console.error( `${dim( "exported" )} ${cnt.id} ${dim( "→" )} ${outFile} ${dim( `(${Buffer.byteLength( json, "utf8" )} bytes)` )}` );
    }
    return;
  }
  console.log( json );
}

// ── continuation log ───────────────────────────────────────────────────────

function cmdContinuationLog( idArg ) {
  if ( !idArg ) die( "Usage: cogentia continuation log <id>" );
  // Best-effort: load continuation for header context; don't fail if it's been pruned.
  // loadContinuation calls die() on missing file, so we must check existence first.
  let cnt = null;
  if ( fs.existsSync( continuationPath( idArg ) ) ) {
    try { cnt = loadContinuation( idArg ); } catch ( _ ) {}
  }

  const configPath = findConfig( process.cwd() );
  if ( !configPath ) die( "No registry found." );
  const auditPath = path.join( path.dirname( configPath ), AUDIT_DIR, AUDIT_FILE );
  if ( !fs.existsSync( auditPath ) ) {
    appendAudit( {
      command: "continuation.log",
      args:    { id: idArg },
      result:  { events: 0, note: "no audit log" },
      narrative: collectNarrative(),
    } );
    if ( JSON_MODE ) { console.log( "[]" ); return; }
    console.log( `\n${hdr( `Continuation log: ${idArg}` )}\n` );
    console.log( `  ${dim( "No audit log yet." )}\n` );
    return;
  }

  const lines = fs.readFileSync( auditPath, "utf8" ).split( "\n" );
  const matching = [];
  const idNeedle = `"${idArg}"`;
  for ( const line of lines ) {
    if ( !line.trim() ) continue;
    if ( !line.includes( idNeedle ) ) continue;
    try {
      const entry = JSON.parse( line );
      matching.push( entry );
    } catch ( _ ) { /* skip malformed */ }
  }

  appendAudit( {
    command: "continuation.log",
    args:    { id: idArg },
    result:  { events: matching.length, found: cnt !== null },
    narrative: collectNarrative(),
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( matching, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( `Continuation log: ${idArg}` )}  ${dim( `${matching.length} event(s)` )}\n` );
  if ( cnt ) {
    console.log( `  ${bold( "status:" )}  ${cnt.status}` );
    console.log( `  ${bold( "task:" )}    ${cnt.task || dim( "(dormant)" )}\n` );
  } else {
    console.log( `  ${dim( "Continuation file not found (pruned?) — showing audit trace only." )}\n` );
  }
  if ( matching.length === 0 ) {
    console.log( `  ${dim( "No matching audit entries." )}\n` );
    return;
  }
  for ( const e of matching ) {
    const ts = ( e.ts || "" ).replace( "T", " " ).replace( /\.\d+Z$/, "Z" );
    const cmd = e.command || "?";
    const summary = e.result
      ? Object.entries( e.result )
          .map( ( [ k, v ] ) => `${k}=${typeof v === "object" ? JSON.stringify( v ) : v}` )
          .join( "  " )
      : "";
    console.log( `  ${dim( ts )}  ${c.cyan}${pad( cmd, 26 )}${c.reset}  ${dim( summary )}` );
    if ( e.narrative && e.narrative.short ) {
      console.log( `                                  ${dim( "└─ " + e.narrative.short )}` );
    }
  }
  console.log();
}

// ── continuation schema ────────────────────────────────────────────────────

const CONTINUATION_SCHEMA_DOC = {
  protocol:  CONTINUATION_PROTOCOL,
  reference: "research/agent_resumable_cli.md",
  continuation: {
    required_minimum: [ "id", "task", "context", "expected_result_schema" ],
    structure: {
      type:                   "string (\"continuation\")",
      protocol:               "string (\"cogentia.continuation.v1\")",
      id:                     "string (ctn_xxxxxxxx)",
      topicId:                "string (URN: urn:cop:topic:cogentia/<repo>[/<paper>])",
      agent:                  "string (\"*\" = any compliant agent)",
      task:                   "string (short task name)",
      context:                "object (domain-specific)",
      alternatives:           "array<{id, description}> (optional)",
      expected_result_schema: "object (key -> type-string)",
      constraints:            "object (optional; tier 2+ — pay-as-you-go verbosity)",
      status:                 "string (active|completed|aborted|dormant)",
      createdAt:              "ISO-8601 timestamp",
      predecessor:            "string (optional, set on successor)",
      successor:              "string (optional, set on completed/aborted predecessor)",
      failed_alternatives:    "array<{id, reason, failed_at}> (accumulated on backtrack)",
      step_result:            "object (embedded after resolve)",
      resume:                 "object ({command: ...})",
      priority:               "integer (optional; default 0; higher sorts first in queue; set via continuation prioritize <id> --priority <N>)",
    },
  },
  step_result: {
    required_minimum: [ "continuation_id", "status" ],
    structure: {
      type:                "string (\"step_result\")",
      continuation_id:     "string",
      status:              "string (success|failed|aborted|needs_more_context)",
      chosen_alternative:  "string (success branch; must be in continuation.alternatives)",
      failed_alternative:  "string (failed branch; must be in continuation.alternatives)",
      reason:              "string",
      confidence:          "number (0..1)",
      "...":               "domain-specific fields per continuation.expected_result_schema",
    },
  },
  validation: {
    default: "loose — warnings to stderr; resume proceeds",
    strict:  "via --strict or COGENTIA_VALIDATE=strict; errors block resume",
  },
  heraclitean_followup: "Every resume that closes a continuation (success or abort) emits a dormant successor — minimal node, linked by predecessor id, same topicId. Chain is non-terminal.",
};

function cmdContinuationSchema() {
  if ( JSON_MODE ) {
    console.log( JSON.stringify( CONTINUATION_SCHEMA_DOC, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( "cogentia.continuation.v1 schema" )}\n` );
  console.log( JSON.stringify( CONTINUATION_SCHEMA_DOC, null, 2 ) );
  console.log();
}

// ── continuation dispatcher ────────────────────────────────────────────────

function cmdContinuation( sub, ...rest ) {
  switch ( sub ) {
    case "emit":       cmdContinuationEmit(       rest[ 0 ] );             break;
    case "inspect":    cmdContinuationInspect(    rest[ 0 ] );             break;
    case "resume":     cmdContinuationResume(     rest[ 0 ], rest[ 1 ] );  break;
    case "fail":       cmdContinuationFail(       rest[ 0 ], rest[ 1 ] );  break;
    case "abort":      cmdContinuationAbort(      rest[ 0 ] );             break;
    case "queue":      cmdContinuationQueue();                             break;
    case "prune":      cmdContinuationPrune();                             break;
    case "schema":     cmdContinuationSchema();                            break;
    case "prioritize": cmdContinuationPrioritize( rest[ 0 ] );             break;
    case "validate":   cmdContinuationValidate(   rest[ 0 ], rest[ 1 ] );  break;
    case "export":     cmdContinuationExport(     rest[ 0 ] );             break;
    case "log":        cmdContinuationLog(        rest[ 0 ] );             break;
    case "consult":    cmdContinuationConsult(    rest[ 0 ] );             break;
    case undefined:
      die( "Usage: cogentia continuation <emit|inspect|resume|fail|abort|queue|prune|schema|prioritize|validate|export|log|consult> ..." );
      break;
    default:
      die( `Unknown continuation subcommand: "${sub}". Try: emit, inspect, resume, fail, abort, queue, prune, schema, prioritize, validate, export, log, consult.` );
  }
}

// ── manifest ──────────────────────────────────────────────────────────────────

/**
 * OpenAI-compatible tool definitions for every command. AI agents (or the
 * inseme Ophélia mediator via cop-host) bind this once to discover the entire
 * CLI surface — same shape inseme briques already use for their `tools` array.
 */
const COGENTIA_JS_VERSION    = "0.10.0";
const COGENTIA_MANIFEST_VERSION = "1.0";

const COMMAND_MANIFEST = [
  {
    name: "add", description: "Register a git repository in the cogentia registry.",
    parameters: { type: "object", properties: { name_or_path: { type: "string", description: "Directory name (search-by-name from CWD) OR a path." } }, required: [ "name_or_path" ] },
    side_effects: [ "registry-write", "audit-log" ],
    examples: [ { input: { name_or_path: "../barons-Mariani" } } ],
  },
  {
    name: "remove", description: "Unregister a git repository from the cogentia registry.",
    parameters: { type: "object", properties: { name: { type: "string", description: "The registered name to remove." } }, required: [ "name" ] },
    side_effects: [ "registry-write", "audit-log" ],
  },
  {
    name: "list", description: "List registered repositories with their on-disk + index status.",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "status", description: "Quick health check across all registered repos (md count, ignored count, unreferenced count).",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "scan", description: "Full scan — list every markdown file per repo, flag those unreferenced in research/index.md and not matched by .cogentiaignore.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "creates research/index.md if missing" ],
  },
  {
    name: "init", description: "Bootstrap research/index.md (Jekyll-ready) in a registered or implicit repo.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Repo name. Optional — defaults to the repo containing CWD." } } },
    side_effects: [ "creates research/ and research/index.md", "audit-log" ],
  },
  {
    name: "ref", description: "Generate a research/index.md entry (Published row + cross-repo Referenced row) for a markdown file.",
    parameters: { type: "object", properties: { file: { type: "string", description: "Path to the .md file." } }, required: [ "file" ] },
    side_effects: [],
  },
  {
    name: "open", description: "Open a repo's research/index.md in the default editor (no-op in headless context).",
    parameters: { type: "object", properties: { name: { type: "string", description: "Optional repo name." } } },
    side_effects: [ "invokes editor" ],
  },
  {
    name: "sync", description: "git pull --ff-only in every registered repo.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "git-pull" ],
  },
  {
    name: "graph", description: "Generate a Mermaid cross-reference graph across all repos.",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "check", description: "Validate every link in every research/index.md (HTTP HEAD + internal file existence).",
    parameters: { type: "object", properties: {} },
    side_effects: [ "outbound-http" ],
  },
  {
    name: "jekyll", description: "Ensure Jekyll-style YAML front-matter in every research/index.md.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "may write research/index.md" ],
  },
  {
    name: "whoami", description: "Detect GitHub identity from registered repo remotes and report the registry location.",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "stamp", description: "Insert canonical_url + last_stamped_at into a markdown file's YAML front-matter, anchored to its GitHub commit URL.",
    parameters: { type: "object", properties: {
      file: { type: "string", description: "Single file. Omit when using --all." },
      all:  { type: "boolean", description: "Stamp every research-grade .md across registered repos." },
      check:{ type: "boolean", description: "Dry-run — report what would change without writing." }
    } },
    side_effects: [ "file-write", "audit-log" ],
  },
  {
    name: "corpus-status", description: "Refresh research/corpus-status.md: auto-regenerate structural sections (Registered Repositories, Cross-Reference Graph, Published, What Remains Possible), preserve manually-curated sections (What Is Proved, Open Objections), bootstrap if missing.",
    parameters: { type: "object", properties: {
      name:  { type: "string", description: "Optional single repo. Default: all registered repos." },
      check: { type: "boolean", description: "Dry-run." }
    } },
    side_effects: [ "file-write", "audit-log" ],
  },
  {
    name: "state", description: "Denormalised JSON snapshot combining registry + status + identity (one call replaces list + status + whoami).",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "explain-ignore", description: "Test a file path against the resolved .cogentiaignore patterns for its owning repo. Report which pattern (if any) matched.",
    parameters: { type: "object", properties: { file: { type: "string" } }, required: [ "file" ] },
    side_effects: [],
  },
  {
    name: "concepts", description: "Manage research/concepts.md as a typed concept registry. The CLI validates structure and links; semantic interpretation remains the responsibility of the human or AI agent using it.",
    parameters: {
      type: "object",
      properties: {
        subcommand: { type: "string", enum: [ "init", "list", "check", "graph", "ref", "status", "schema" ], description: "Concept registry operation." },
        repo:       { type: "string", description: "Optional registered repo name. Default: all repos for init/list/check/graph/status." },
        concept:    { type: "string", description: "Concept name for ref." },
        check:      { type: "boolean", description: "Dry-run for status refresh." }
      },
      required: [ "subcommand" ],
    },
    side_effects: [ "may write research/concepts.md", "may write research/corpus-status.md", "audit-log" ],
  },
  {
    name: "manifest", description: "Return this command manifest itself (OpenAI-compatible tool definitions for every command).",
    parameters: { type: "object", properties: {} },
    side_effects: [],
  },
  {
    name: "continuation", description: "Emit/inspect/resume/fail/abort/queue/prioritize/validate/export/log typed continuation requests — cogentia.continuation.v1, a provider-neutral protocol for surfacing missing judgment as serializable, schema-bearing, resumable objects across process boundaries. See research/agent_resumable_cli.md.",
    parameters: {
      type: "object",
      properties: {
        subcommand:       { type: "string", enum: [ "emit", "inspect", "resume", "fail", "abort", "queue", "prune", "schema", "prioritize", "validate", "export", "log" ], description: "Continuation operation to perform." },
        task_file:        { type: "string", description: "Path to a JSON task descriptor (emit)." },
        id:               { type: "string", description: "Continuation id (inspect/resume/fail/abort/prioritize/validate/export/log)." },
        step_result_file: { type: "string", description: "Path to a step_result JSON (resume / validate)." },
        branch_id:        { type: "string", description: "Alternative id (fail)." },
        paper:            { type: "string", description: "Optional --paper <file>: derive topicId from the document's path inside its owning repo." },
        topic:            { type: "string", description: "Optional --topic <urn>: override topic explicitly." },
        from:             { type: "string", description: "Optional --from <id>: activate a dormant successor in place." },
        priority:         { type: "integer", description: "Optional --priority <N> for prioritize: integer; higher sorts first in queue. Omit to read current priority." },
        output:           { type: "string", description: "Optional -o/--output <file> for export: write JSON to file instead of stdout." },
        bundle:           { type: "boolean", description: "Optional --bundle flag for export: include predecessor + successor in the exported payload." },
        reason:           { type: "string", description: "Reason string for fail/abort." },
        status:           { type: "string", description: "Filter for queue (active|completed|aborted|dormant)." },
        strict:           { type: "boolean", description: "Reject resume on validation issues (also via COGENTIA_VALIDATE=strict)." },
      },
      required: [ "subcommand" ],
    },
    side_effects: [ "file-write", "audit-log" ],
  },
  {
    name: "install-hooks", description: "Install Git pre-commit hooks in all registered repositories to enforce cogentia status checks.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "file-write" ],
  },
  {
    name: "init-jekyll", description: "Bootstrap GitHub Pages support (_config.yml) in all registered repositories.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "file-write" ],
  },
  {
    name: "backlinks", description: "Scan all Markdown files to build an inverted cross-reference index and auto-inject 'Mentioned in' lists at the bottom of targeted documents.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "file-write" ],
  },
  {
    name: "trails", description: "Parse research/trails/*.md playlists and auto-inject Previous/Next navigation headers in referenced documents.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "file-write" ],
  },
  {
    name: "query", description: "Structural search engine for AI agents. Searches Markdown files, ignoring node_modules and .cogentiaignore paths. Use --json for structured output.",
    parameters: { type: "object", properties: { keyword: { type: "string" }, regex: { type: "boolean", description: "Use regex matching" }, repo: { type: "string", description: "Optional repo filter" } }, required: [ "keyword" ] },
    side_effects: [],
  },
  {
    name: "bundle", description: "Context bundler for AI agents. Concatenates all Markdown files related to a concept or trail into a single structured output.",
    parameters: { type: "object", properties: { concept: { type: "string" }, trail: { type: "string" }, repo: { type: "string" }, all: { type: "boolean" } } },
    side_effects: [],
  },
  {
    name: "consolidate",
    description: "Pre-commit consolidation ritual. Runs drift (sync state), lint --strict (unreferenced, frontmatter, drift problems), refresh --check (corpus-status, backlinks, trails, documents — dry-run), and todo list --global (scheduler items) in that order. Use when you feel the work is reasonably ready to publish — surfaces problems that should be fixed before the next git commit. Read-only: no files modified. The audit log records a single 'consolidate' entry at start.",
    parameters: { type: "object", properties: {} },
    side_effects: [ "audit-log", "network (via drift fetch)" ],
    examples: [ { input: {} } ],
  },
  {
    name: "links",
    description: "Convert backtick `*.md` references to clickable Markdown links across the corpus. Default mode is --check (preview, no writes). --fix applies the changes. Resolves each reference against the registry-wide doc index, preferring same-repo matches (relative path) over cross-repo hits (absolute GitHub URL). Skips lines inside fenced code blocks and headings by default; skips refs already wrapped in [...]() ; skips self-references and unresolvable names (which may be planned-but-not-yet-published docs).",
    parameters: {
      type: "object",
      properties: {
        repo:              { type: "string", description: "Optional repo name (positional) — limit scan to one repo, or 'all' (default)." },
        check:             { type: "boolean", description: "Preview only. Default true when --fix is absent." },
        fix:               { type: "boolean", description: "Apply conversions. Audit-logged as links.fix." },
        include_headings:  { type: "boolean", description: "Also convert refs inside #..# headings (off by default to keep anchors clean)." },
        include_code:      { type: "boolean", description: "Also convert refs inside fenced ```/~~~ code blocks (off by default)." },
      },
    },
    side_effects: [ "file-write (in --fix mode)", "audit-log" ],
    examples: [
      { input: { repo: "all" } },
      { input: { repo: "all", fix: true } },
      { input: { repo: "cogentia", check: true } },
    ],
  },
];

const GLOBAL_FLAGS = [
  { name: "--json",             description: "Machine-readable JSON output." },
  { name: "--registry <path>",  description: "Override registry location (.cogentia.json file or its containing dir). Also honours COGENTIA_REGISTRY env var." },
  { name: "--cwd <path>",       description: "Change effective working directory before running." },
  { name: "--narrative-short <text>", description: "Short description of the change (for audit log + future Commons narrative)." },
  { name: "--narrative-long <text>",  description: "Long description / reasoning (audit log)." },
  { name: "--chat-url <url>",   description: "URL pointing to a conversational-agent session that informed this action. Repeatable." },
];

function cmdManifest() {
  const tools = COMMAND_MANIFEST.map( c => ( {
    type:     "function",
    function: { name: c.name, description: c.description, parameters: c.parameters },
    cogentia: {
      side_effects:  c.side_effects || [],
      examples:      c.examples     || [],
    },
  } ) );

  const out = {
    cogentia_manifest_version: COGENTIA_MANIFEST_VERSION,
    cogentia_js_version:       COGENTIA_JS_VERSION,
    global_flags:              GLOBAL_FLAGS,
    audit_log:                 `${AUDIT_DIR}/${AUDIT_FILE} (in the registry-containing directory; one JSONL line per state-changing call)`,
    tools,
  };

  if ( JSON_MODE ) {
    console.log( JSON.stringify( out, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "cogentia.js manifest" )}  ${dim( `v${COGENTIA_JS_VERSION}, manifest schema v${COGENTIA_MANIFEST_VERSION}` )}\n` );
  for ( const t of tools ) {
    console.log( `  ${bold( t.function.name )}` );
    console.log( `    ${dim( t.function.description )}` );
    if ( t.cogentia.side_effects.length ) {
      console.log( `    ${dim( `side_effects: ${t.cogentia.side_effects.join( ", " )}` )}` );
    }
  }
  console.log();
  console.log( `  ${bold( "(use --json for the OpenAI-tool-compatible structured output)" )}` );
  console.log();
}

// ── state ─────────────────────────────────────────────────────────────────────

function cmdState() {
  const { configPath, config } = loadConfig();
  const result = {
    cogentia_js_version: COGENTIA_JS_VERSION,
    registry:            configPath || null,
    repo_count:          config.repos.length,
    repos:               [],
    detected:            null,
    profile_repo_path:   null,
  };

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    const r        = { name: entry.name, found: !!repoPath, path: repoPath || null };

    if ( repoPath ) {
      const indexPath = path.join( repoPath, "research", "index.md" );
      const hasIndex  = fs.existsSync( indexPath );
      r.has_index     = hasIndex;
      r.branch        = gitCurrentBranch( repoPath );
      r.last_commit   = gitLastCommit( repoPath );
      r.remote        = gitRemoteOwner( repoPath );

      if ( hasIndex ) {
        const indexContent   = fs.readFileSync( indexPath, "utf8" );
        const referenced     = buildReferencedFileSet( indexPath, indexContent );
        const mdFiles        = listMarkdown( repoPath );
        const ignorePatterns = loadIgnore( repoPath );
        const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
        const ignoredSet     = new Set( ignored.map( f => f.rel ) );
        const unreferenced   = mdFiles.filter( f => {
          if ( f.rel === "research/index.md" ) return false;
          if ( ignoredSet.has( f.rel ) )       return false;
          return !referenced.has( f.full );
        } );
        r.markdown_total     = mdFiles.length;
        r.ignored_count      = ignored.length;
        r.unreferenced_count = unreferenced.length;
        r.unreferenced       = unreferenced.map( f => f.rel );
      }

      const corpusFile = findCorpusStatusFile( repoPath );
      r.has_corpus_status = !!corpusFile;
      if ( corpusFile ) r.corpus_status_path = corpusFile;

      const conceptsFile = findConceptsFile( repoPath );
      r.has_concepts = !!conceptsFile;
      if ( conceptsFile ) {
        const loaded = loadConceptsForRepo( entry );
        r.concepts_path = conceptsFile;
        r.concepts_count = loaded.concepts.length;
        r.concepts = loaded.concepts.map( cpt => ( {
          name: cpt.name, scope: cpt.scope, status: cpt.status, type: cpt.type, slug: cpt.slug,
        } ) );
      }
    }

    result.repos.push( r );

    if ( !result.detected && repoPath ) {
      const info = gitRemoteOwner( repoPath );
      if ( info ) {
        result.detected         = info.owner;
        const profile           = detectProfileRepoLocation( repoPath );
        if ( profile ) result.profile_repo_path = profile;
      }
    }
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Cogentia state" )}\n` );
  console.log( `  ${bold( "Registry:" )}     ${result.registry || warn( "(none)" )}` );
  console.log( `  ${bold( "GitHub user:" )} ${result.detected || dim( "(undetected)" )}` );
  console.log( `  ${bold( "Repos:" )}        ${result.repo_count}` );
  console.log();
  console.log( `  ${dim( "Use --json for the full denormalised snapshot." )}` );
  console.log();
}

// ── frontmatter ───────────────────────────────────────────────────────────────

function cmdFrontmatterSchema() {
  const schema = {
    level_1_stamp: { fields: FRONTMATTER_LEVEL_1, emitted_by: "cogentia.js stamp" },
    level_2_document: {
      required: FRONTMATTER_LEVEL_2_REQUIRED,
      optional: FRONTMATTER_LEVEL_2_OPTIONAL,
      emitted_by: "cogentia.js frontmatter promote",
    },
    level_3_extensions: FRONTMATTER_LEVEL_3,
    status_vocabulary:  FRONTMATTER_STATUS_VOCABULARY,
    deprecated_fields:  FRONTMATTER_DEPRECATED,
    auto_view_patterns: FRONTMATTER_AUTO_VIEW_RE.map( re => re.source ),
  };
  if ( JSON_MODE ) { console.log( JSON.stringify( schema, null, 2 ) ); return; }

  console.log( `\n${hdr( "Frontmatter schema (canonical)" )}  ${dim( fmtNow() )}\n` );
  console.log( `  ${bold( "Level 1 - Stamp" )}  ${dim( "(auto-stamped, always present)" )}` );
  for ( const k of FRONTMATTER_LEVEL_1 ) console.log( `    ${c.cyan}${k}${c.reset}` );
  console.log();
  console.log( `  ${bold( "Level 2 - Document base" )}  ${dim( "(required for substantive papers)" )}` );
  for ( const k of FRONTMATTER_LEVEL_2_REQUIRED ) console.log( `    ${c.cyan}${k}${c.reset}  ${dim( "(required)" )}` );
  for ( const k of FRONTMATTER_LEVEL_2_OPTIONAL ) console.log( `    ${c.cyan}${k}${c.reset}  ${dim( "(optional)" )}` );
  console.log();
  console.log( `  ${bold( "Level 3 - Extensions by use case" )}` );
  for ( const [ group, fields ] of Object.entries( FRONTMATTER_LEVEL_3 ) ) {
    console.log( `    ${dim( group.padEnd( 14 ) )} ${fields.map( f => c.cyan + f + c.reset ).join( ", " ) }` );
  }
  console.log();
  console.log( `  ${bold( "Controlled vocabulary for status:" )}` );
  console.log( `    ${FRONTMATTER_STATUS_VOCABULARY.map( s => c.green + s + c.reset ).join( " · " )}` );
  console.log();
  console.log( `  ${bold( "Deprecated fields (to remove on edit)" )}` );
  console.log( `    ${FRONTMATTER_DEPRECATED.map( s => c.yellow + s + c.reset ).join( " · " )}` );
  console.log();
}

function cmdFrontmatterCheck( repoArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const repos = repoArg ? config.repos.filter( r => r.name === repoArg ) : config.repos;
  if ( repoArg && repos.length === 0 ) die( `Repo not found: ${repoArg}` );

  const result = { timestamp: fmtNow(), repos: [] };
  for ( const entry of repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const ignore  = loadIgnore( repoPath );
    const mdFiles = listMarkdown( repoPath );
    const files   = [];

    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignore ) ) continue;
      let content = "";
      try { content = fs.readFileSync( f.full, "utf8" ); } catch ( _ ) { continue; }
      const fm   = parseFrontmatter( content );
      const auto = isAutoView( f.rel );
      const deprecated = [];
      let statusBad = null, state = "complete", missingL2 = [];
      if ( !fm ) {
        state = auto ? "no-frontmatter-auto" : "no-frontmatter";
      } else {
        for ( const k of FRONTMATTER_DEPRECATED ) if ( k in fm ) deprecated.push( k );
        if ( fm.status && !frontmatterCanonicalStatus( fm.status ) ) statusBad = fm.status;
        if ( !auto ) {
          for ( const k of FRONTMATTER_LEVEL_2_REQUIRED ) if ( !( k in fm ) ) missingL2.push( k );
          if ( missingL2.length === FRONTMATTER_LEVEL_2_REQUIRED.length ) state = "level-1-only";
          else if ( missingL2.length > 0 )                                state = "partial";
        }
      }
      files.push( { path: f.rel, state, auto, missingL2, deprecated, statusBad } );
    }
    result.repos.push( { name: entry.name, files } );
  }

  if ( JSON_MODE ) { console.log( JSON.stringify( result, null, 2 ) ); return; }

  console.log( `\n${hdr( "Frontmatter check" )}  ${dim( result.timestamp )}\n` );
  for ( const r of result.repos ) {
    const sm = {
      complete:  r.files.filter( f => f.state === "complete" ).length,
      partial:   r.files.filter( f => f.state === "partial" ).length,
      level1:    r.files.filter( f => f.state === "level-1-only" ).length,
      noFm:      r.files.filter( f => f.state === "no-frontmatter" ).length,
      auto:      r.files.filter( f => f.auto ).length,
      depUsage:  r.files.filter( f => f.deprecated.length > 0 ).length,
      statusBad: r.files.filter( f => f.statusBad ).length,
    };
    console.log( `  ${bold( r.name )}` );
    console.log( `    ${dim( sm.complete + " complete · " + sm.partial + " partial · " + sm.level1 + " level-1-only · " + sm.noFm + " no-frontmatter · " + sm.auto + " auto-views" )}` );
    if ( sm.depUsage )  console.log( `    ${c.yellow}${sm.depUsage} file(s) use deprecated field name(s)${c.reset}` );
    if ( sm.statusBad ) console.log( `    ${c.yellow}${sm.statusBad} file(s) carry a status value outside the vocabulary${c.reset}` );

    for ( const f of r.files ) {
      const hasIssue = f.state !== "complete" || f.deprecated.length > 0 || f.statusBad;
      if ( !hasIssue ) continue;
      if ( f.auto && f.deprecated.length === 0 && !f.statusBad ) continue;
      let label;
      switch ( f.state ) {
        case "level-1-only":      label = warn( "level-1 only" ); break;
        case "partial":           label = `${c.yellow}missing ${f.missingL2.length}${c.reset}`; break;
        case "no-frontmatter":    label = fail( "no frontmatter" ); break;
        case "no-frontmatter-auto": label = dim( "no frontmatter (auto-view)" ); break;
        default:                  label = dim( "complete" );
      }
      const extras = [];
      if ( f.statusBad )             extras.push( `${c.red}status: "${f.statusBad}"${c.reset}` );
      if ( f.deprecated.length > 0 ) extras.push( `${c.yellow}deprecated: ${f.deprecated.join( "," )}${c.reset}` );
      console.log( `    ${dim( pad( f.path, 60 ) )} ${label}${extras.length ? "  " + extras.join( "  " ) : ""}` );
    }
    console.log();
  }
}

function cmdFrontmatterPromoteBatch() {
  const checkOnly = argv.includes( "--check" );
  const repoArg   = getFlagValue( "--repo" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found." );
  const repos = repoArg ? config.repos.filter( r => r.name === repoArg ) : config.repos;
  if ( repoArg && repos.length === 0 ) die( `Repo not found: ${repoArg}` );

  const invariants = {
    author:      "Jean Hugues Noël Robert, baron Mariani",
    affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica",
    license:     "CC BY-SA 4.0",
  };
  const summary = { timestamp: fmtNow(), checkOnly, repos: [], touched: 0, addedFields: 0 };

  for ( const entry of repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const repoReport = { name: entry.name, files: [] };
    const ignore  = loadIgnore( repoPath );
    const mdFiles = listMarkdown( repoPath );

    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignore ) ) continue;
      if ( isAutoView( f.rel ) ) continue;
      let content;
      try { content = fs.readFileSync( f.full, "utf8" ); } catch ( _ ) { continue; }
      const fm = parseFrontmatter( content );
      const toAdd = [];
      for ( const [ k, v ] of Object.entries( invariants ) ) {
        if ( !fm || !( k in fm ) ) toAdd.push( [ k, v ] );
      }
      if ( toAdd.length === 0 ) continue;

      if ( !checkOnly ) {
        if ( !fm ) {
          const lines = [ "---" ];
          for ( const [ k, v ] of toAdd ) lines.push( `${k}: "${v}"` );
          lines.push( "---", "" );
          fs.writeFileSync( f.full, lines.join( "\n" ) + content, "utf8" );
        } else {
          const fmMatch = content.match( /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/ );
          if ( !fmMatch ) continue;
          let fmText = fmMatch[ 1 ];
          const additions = toAdd.map( ( [ k, v ] ) => `${k}: "${v}"` );
          const stampRe = /^last_stamped_at:.*$/m;
          if ( stampRe.test( fmText ) ) {
            fmText = fmText.replace( stampRe, ( m ) => additions.join( "\n" ) + "\n" + m );
          } else {
            fmText = fmText.replace( /\s+$/, "" ) + "\n" + additions.join( "\n" );
          }
          fs.writeFileSync( f.full, `---\n${fmText}\n---\n` + content.slice( fmMatch[ 0 ].length ), "utf8" );
        }
      }
      repoReport.files.push( { path: f.rel, added: toAdd.map( ( [ k ] ) => k ) } );
      summary.touched++;
      summary.addedFields += toAdd.length;
    }
    summary.repos.push( repoReport );
  }

  if ( JSON_MODE ) { console.log( JSON.stringify( summary, null, 2 ) ); return; }
  const title = checkOnly ? "Frontmatter batch promote (check)" : "Frontmatter batch promote";
  console.log( `\n${hdr( title )}  ${dim( summary.timestamp )}\n` );
  console.log( `  ${dim( "Invariants only: " )}${c.cyan}author${c.reset}, ${c.cyan}affiliation${c.reset}, ${c.cyan}license${c.reset}  ${dim( "(title/date/status/version left for human edit)" )}` );
  console.log();
  for ( const r of summary.repos ) {
    if ( r.files.length === 0 ) continue;
    console.log( `  ${bold( r.name )}  ${dim( "(" + r.files.length + " file" + ( r.files.length > 1 ? "s" : "" ) + ")" )}` );
    for ( const f of r.files ) {
      console.log( `    ${dim( pad( f.path, 56 ) )} ${c.green}+ ${f.added.join( ", " )}${c.reset}` );
    }
    console.log();
  }
  const verb = checkOnly ? "would add" : "added";
  console.log( `  ${bold( "Total:" )}  ${verb} ${summary.addedFields} field(s) across ${summary.touched} file(s)` );
  if ( checkOnly ) console.log( `  ${dim( "Re-run without --check to apply." )}` );
  console.log();

  if ( !checkOnly && summary.touched > 0 ) {
    appendAudit( {
      command:   "frontmatter promote --batch",
      args:      { repo: repoArg || null, check: false },
      result:    { touched: summary.touched, addedFields: summary.addedFields },
      narrative: collectNarrative(),
    } );
  }
}

function cmdFrontmatterPromote( fileArg ) {
  if ( argv.includes( "--batch" ) ) return cmdFrontmatterPromoteBatch();
  if ( !fileArg ) die( "Usage: cogentia frontmatter promote <file>  |  promote --batch [--repo <name>] [--check]" );

  const absPath = path.resolve( fileArg );
  if ( !fs.existsSync( absPath ) ) die( `File not found: ${fileArg}` );
  const content = fs.readFileSync( absPath, "utf8" );
  const fm = parseFrontmatter( content );
  const today = fmtDate( new Date() );

  let titleFromBody = null;
  const bodyMatch = content.match( /^#\s+(.+)$/m );
  if ( bodyMatch ) titleFromBody = bodyMatch[ 1 ].trim();

  const skeleton = {
    title:       titleFromBody || path.basename( absPath, ".md" ),
    author:      "Jean Hugues Noël Robert, baron Mariani",
    affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica",
    date:        today,
    license:     "CC BY-SA 4.0",
    status:      "draft",
  };

  if ( !fm ) {
    const lines = [ "---" ];
    for ( const [ k, v ] of Object.entries( skeleton ) ) lines.push( `${k}: "${v}"` );
    lines.push( "---", "" );
    fs.writeFileSync( absPath, lines.join( "\n" ) + content, "utf8" );
    console.log( ok( absPath ) );
    console.log( dim( "  Created frontmatter with Level 2 skeleton." ) );
    console.log( dim( "  Review placeholder values, then run `cogentia stamp <file>` to add Level 1." ) );
    return;
  }

  const fmMatch = content.match( /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/ );
  if ( !fmMatch ) die( "Could not parse frontmatter block." );
  const additions = [];
  for ( const [ k, v ] of Object.entries( skeleton ) ) {
    if ( k in fm ) continue;
    additions.push( `${k}: "${v}"` );
  }
  if ( additions.length === 0 ) {
    console.log( dim( absPath + " — already has all Level 2 fields. Nothing to add." ) );
    return;
  }
  let fmText = fmMatch[ 1 ];
  const stampLineRe = /^last_stamped_at:.*$/m;
  if ( stampLineRe.test( fmText ) ) {
    fmText = fmText.replace( stampLineRe, ( m ) => additions.join( "\n" ) + "\n" + m );
  } else {
    fmText = fmText.replace( /\s+$/, "" ) + "\n" + additions.join( "\n" );
  }
  fs.writeFileSync( absPath, `---\n${fmText}\n---\n` + content.slice( fmMatch[ 0 ].length ), "utf8" );

  console.log( ok( absPath ) );
  console.log( dim( "  Added " + additions.length + " Level 2 field(s)." ) );
  for ( const a of additions ) console.log( `    ${dim( "+ " + a )}` );
  appendAudit( {
    command: "frontmatter promote",
    args:    { file: absPath },
    result:  { added: additions.length },
    narrative: collectNarrative(),
  } );
}

function cmdFrontmatter( sub, ...rest ) {
  switch ( sub ) {
    case "check":   cmdFrontmatterCheck( rest[ 0 ] ); break;
    case "promote": cmdFrontmatterPromote( rest[ 0 ] ); break;
    case "schema":  cmdFrontmatterSchema(); break;
    default:
      die( "Usage: cogentia frontmatter <check [repo] | promote <file> | promote --batch [--repo <name>] [--check] | schema>" );
  }
}

// ── explain-ignore ────────────────────────────────────────────────────────────

function cmdExplainIgnore( fileArg ) {
  if ( !fileArg ) die( "Usage: cogentia explain-ignore <file>" );
  const absPath = path.resolve( fileArg );
  const { config } = loadConfig();
  const owner = findOwnerRepo( absPath, config );

  const result = {
    file:       absPath,
    in_repo:    owner ? owner.entry.name : null,
    relpath:    owner ? path.relative( owner.repoPath, absPath ).replace( /\\/g, "/" ) : null,
    ignored:    false,
    matched_by: null,
    patterns_in_effect: owner ? loadIgnore( owner.repoPath ) : [ ...BUILTIN_IGNORE ],
    builtin:    BUILTIN_IGNORE,
  };

  if ( owner ) {
    const patterns = result.patterns_in_effect;
    const rel      = result.relpath;
    const base     = path.basename( rel );
    for ( const p of patterns ) {
      if ( !p.includes( "/" ) ) {
        if ( base === p ) { result.ignored = true; result.matched_by = p; result.match_kind = "basename"; break; }
      } else {
        if ( patternToRegex( p ).test( rel ) ) { result.ignored = true; result.matched_by = p; result.match_kind = "path-glob"; break; }
      }
    }
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    return;
  }

  console.log( `\n${hdr( "Ignore-match check" )}\n` );
  console.log( `  ${bold( "File:" )}     ${result.file}` );
  if ( !owner ) {
    console.log( `  ${warn( "Not inside any registered repo. Built-in defaults apply." )}` );
  } else {
    console.log( `  ${bold( "Repo:" )}     ${result.in_repo}` );
    console.log( `  ${bold( "Relpath:" )}  ${result.relpath}` );
  }
  if ( result.ignored ) {
    console.log( `  ${ok( `IGNORED via "${result.matched_by}" (${result.match_kind})` )}` );
  } else {
    console.log( `  ${dim( "Not ignored — would be subject to research/index.md reference check." )}` );
  }
  console.log();
}


// ── navigation & wiki features ────────────────────────────────────────────────

function cmdInitJekyll() {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const results = [];
  
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const configYmlPath = path.join( repoPath, "_config.yml" );
    const content = `title: "Cogentia Corpus — ${entry.name}"\ndescription: "Distributed research and governance."\ntheme: just-the-docs\n\ncolor_scheme: dark\n\n# Cogentia structure\naux_links:\n  "Cogentia README": "https://github.com/JeanHuguesRobert/cogentia"\n\n# Disable default Jekyll behavior that might interfere with raw Markdown files\nexclude:\n  - ".cogentiaignore"\n  - ".git/"\n  - "node_modules/"\n`;
    if (!fs.existsSync(configYmlPath)) {
      fs.writeFileSync(configYmlPath, content, "utf8");
      results.push( { name: entry.name, action: "created" } );
    } else {
      results.push( { name: entry.name, action: "exists" } );
    }
  }
  
  if ( JSON_MODE ) { console.log( JSON.stringify( { results }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Jekyll Configuration" )}\n` );
  for ( const r of results ) {
    console.log( `  ${bold( pad( r.name, 18 ) )} ${r.action === "created" ? ok( "created _config.yml" ) : dim( "already exists" )}` );
  }
  console.log();
}

function buildBacklinksIndex() {
  const { config } = loadConfig();
  const index = new Map();
  
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const mdFiles = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignorePatterns ) ) continue;
      
      const content = fs.readFileSync( f.full, "utf8" );
      const titleMatch = content.match( /^title:\s*"([^"]+)"/m ) || content.match( /^#\s+(.+)$/m );
      const sourceTitle = titleMatch ? titleMatch[1].trim() : path.basename( f.rel );
      
      const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/g;
      let m;
      while ( ( m = linkRegex.exec( content ) ) ) {
        const linkPath = m[2];
        if ( linkPath.startsWith( "http" ) ) continue;
        const targetAbs = path.resolve( path.dirname( f.full ), linkPath ).toLowerCase();
        
        if ( !index.has( targetAbs ) ) index.set( targetAbs, [] );
        const arr = index.get( targetAbs );
        if ( !arr.some( a => a.sourceFull === f.full ) ) {
          arr.push( { sourceRepo: entry.name, sourceRel: f.rel, sourceFull: f.full, sourceTitle } );
        }
      }
    }
  }
  return index;
}

function cmdBacklinks() {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  
  const index = buildBacklinksIndex();
  let updatedCount = 0;
  
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const mdFiles = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignorePatterns ) ) continue;
      const targetAbs = f.full.toLowerCase();
      const links = index.get( targetAbs );
      if ( !links || links.length === 0 ) continue;
      
      let content = fs.readFileSync( f.full, "utf8" );
      const original = content;
      
      // Sort by (sourceRepo, sourceRel) for deterministic output across runs.
      // Without this, the order depends on FS iteration order in buildBacklinksIndex
      // and produces spurious diffs corpus-wide on every refresh.
      links.sort( ( a, b ) => {
        if ( a.sourceRepo !== b.sourceRepo ) return a.sourceRepo.localeCompare( b.sourceRepo );
        return a.sourceRel.localeCompare( b.sourceRel );
      } );

      let block = "### Backlinks\n\n*These documents link to this file:*\n";
      for ( const link of links ) {
        const relPath = path.relative( path.dirname( f.full ), link.sourceFull ).replace( /\\/g, "/" );
        block += `- [${link.sourceTitle}](${relPath})\n`;
      }
      
      if ( !content.includes( "<!-- BEGIN_AUTO: backlinks -->" ) ) {
        content += `\n\n<!-- BEGIN_AUTO: backlinks -->\n<!-- END_AUTO: backlinks -->\n`;
      }
      
      const r = replaceMarkedSection( content, "backlinks", block );
      if ( r.updated && r.content !== original ) {
        fs.writeFileSync( f.full, r.content, "utf8" );
        updatedCount++;
      }
    }
  }
  
  if ( JSON_MODE ) { console.log( JSON.stringify( { updated: updatedCount }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Backlinks Auto-Injection" )}\n` );
  console.log( `  Injected/Updated backlinks in ${bold( updatedCount )} files.` );
  console.log();
}

function cmdTrails() {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );

  let updatedCount = 0;
  const trails = [];

  // Precompute metadata for each registered repo. Used to (a) accept absolute
  // GitHub URLs as item targets, and (b) emit absolute URLs in banners that
  // cross repo boundaries (GitHub does not resolve `../../<sibling-repo>/...`).
  const repoMeta = config.repos.map( entry => {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) return null;
    return {
      name:   entry.name,
      repoPath,
      remote: gitRemoteOwner( repoPath ),
      branch: gitCurrentBranch( repoPath ),
    };
  } ).filter( Boolean );

  function owningRepo( absPath ) {
    for ( const meta of repoMeta ) {
      const rel = path.relative( meta.repoPath, absPath );
      if ( rel && !rel.startsWith( ".." ) && !path.isAbsolute( rel ) ) {
        return { meta, rel: rel.replace( /\\/g, "/" ) };
      }
    }
    return null;
  }

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const trailsDir = path.join( repoPath, "research", "trails" );
    if ( !fs.existsSync( trailsDir ) ) continue;

    // Sort readdirSync output so trail-banner stacking order is stable across
    // runs when a target appears in multiple trails (otherwise FS-iteration
    // order leaks into the rendered banner sequence).
    for ( const file of fs.readdirSync( trailsDir ).sort() ) {
      if ( !file.endsWith( ".md" ) ) continue;
      const full = path.join( trailsDir, file );
      const rawContent = fs.readFileSync( full, "utf8" );
      // Auto-injected sections (backlinks etc.) use the same bullet-link
      // format as trail items. Strip them before parsing so we never
      // duplicate-count the same target as an item.
      const autoIdx = rawContent.indexOf( "<!-- BEGIN_AUTO:" );
      const content = autoIdx >= 0 ? rawContent.slice( 0, autoIdx ) : rawContent;
      const titleMatch = content.match( /^#\s+Trail:\s*(.+)$/m );
      if ( !titleMatch ) continue;
      const trailName = titleMatch[1].trim();

      const items = [];
      const linkRegex = /^\s*(?:\d+\.|\*|-)\s+\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/gm;
      let m;
      while ( ( m = linkRegex.exec( content ) ) ) {
        const linkTitle = m[1];
        const linkPath  = m[2];
        let targetAbs   = null;

        // Accept absolute GitHub URLs as item targets — required for cross-repo
        // trails to render on GitHub (relative paths cannot leave a repo there).
        const urlMatch = linkPath.match( /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/[^/]+\/(.+\.md)$/ );
        if ( urlMatch ) {
          const repoName = urlMatch[2];
          const meta = repoMeta.find( r => r.name === repoName );
          if ( meta ) targetAbs = path.resolve( meta.repoPath, urlMatch[3] );
        } else {
          targetAbs = path.resolve( path.dirname( full ), linkPath );
        }

        if ( targetAbs && fs.existsSync( targetAbs ) ) {
          const owning = owningRepo( targetAbs );
          let githubUrl = null;
          let repoName  = null;
          if ( owning ) {
            repoName = owning.meta.name;
            if ( owning.meta.remote ) {
              githubUrl = `https://github.com/${owning.meta.remote.owner}/${owning.meta.remote.repo}/blob/${owning.meta.branch}/${owning.rel}`;
            }
          }
          items.push( {
            title:        linkTitle,
            fullPath:     targetAbs,
            relFromTrail: linkPath,
            repoName,
            githubUrl,
          } );
        }
      }

      if ( items.length > 0 ) {
        trails.push( { repo: entry.name, name: trailName, source: full, items } );
      }
    }
  }

  // Cross-repo links get an absolute GitHub URL; same-repo links stay relative.
  function bannerHref( fromItem, toItem ) {
    if ( fromItem.repoName && toItem.repoName
      && fromItem.repoName !== toItem.repoName
      && toItem.githubUrl ) {
      return toItem.githubUrl;
    }
    return path.relative( path.dirname( fromItem.fullPath ), toItem.fullPath ).replace( /\\/g, "/" );
  }

  const fileUpdates = new Map();
  for ( const trail of trails ) {
    for ( let i = 0; i < trail.items.length; i++ ) {
      const item = trail.items[i];
      const prev = i > 0 ? trail.items[i - 1] : null;
      const next = i < trail.items.length - 1 ? trail.items[i + 1] : null;

      let block = `> 🧭 **Trail: ${trail.name}**\n> `;
      const parts = [];
      if ( prev ) parts.push( `⬅️ Previous: [${prev.title}](${bannerHref( item, prev )})` );
      if ( next ) parts.push( `➡️ Next: [${next.title}](${bannerHref( item, next )})` );
      block += parts.join( " | " ) + "\n";

      if ( !fileUpdates.has( item.fullPath ) ) fileUpdates.set( item.fullPath, [] );
      fileUpdates.get( item.fullPath ).push( block );
    }
  }
  
  for ( const [ targetAbs, blocks ] of fileUpdates.entries() ) {
    let content = fs.readFileSync( targetAbs, "utf8" );
    const original = content;
    const finalBlock = blocks.join( "\n" );
    
    if ( !content.includes( "<!-- BEGIN_AUTO: trails -->" ) ) {
      const fmMatch = content.match( /^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n#\s+[^\r\n]+\r?\n\r?\n/ );
      if ( fmMatch ) {
        content = content.slice( 0, fmMatch[0].length ) + "<!-- BEGIN_AUTO: trails -->\n<!-- END_AUTO: trails -->\n\n" + content.slice( fmMatch[0].length );
      } else {
        content = "<!-- BEGIN_AUTO: trails -->\n<!-- END_AUTO: trails -->\n\n" + content;
      }
    }
    
    const r = replaceMarkedSection( content, "trails", finalBlock );
    if ( r.updated && r.content !== original ) {
      fs.writeFileSync( targetAbs, r.content, "utf8" );
      updatedCount++;
    }
  }
  
  if ( JSON_MODE ) { console.log( JSON.stringify( { trails: trails.length, updated: updatedCount }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Navigation Trails Injection" )}\n` );
  console.log( `  Found ${bold( trails.length )} trails.` );
  console.log( `  Injected/Updated trail headers in ${bold( updatedCount )} files.` );
  console.log();
}


// ── links ─────────────────────────────────────────────────────────────────────
//
// `cogentia links` scans research-grade .md files for backtick references to
// other corpus documents — `pipeline.md`, `agent_resumable_cli.md`, `path/to/x.md`,
// — and offers to rewrite them as clickable Markdown links: [`name.md`](path-or-url).
//
// By default it runs as --check (preview, no writes). --fix applies the changes.
// Per the Object/Associated documents convention (see cogentia/research/pipeline.md),
// the goal is exhaustive navigability without overwriting human-curated link text.
//
// Skips by default:
//   - lines inside fenced code blocks (``` or ~~~) — --include-code overrides
//   - lines starting with #..# (headings, to keep anchors clean) — --include-headings overrides
//   - backticks already inside [...]( ) (already linked)
//   - LINKS_SKIP_NAMES (per-repo conventions with no canonical home)
//
// Resolution policy: prefer same-repo match (relative path); else cogentia
// (meta-node) if it carries the basename; else first registry hit (absolute
// GitHub URL). Self-references are dropped.

const LINKS_SKIP_NAMES = new Set( [
  "LICENSE.md", "LICENSE",
  "TODO.md",
  "CHANGELOG.md", "CHANGES.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
] );

const LINKS_DOC_REF_RE = /(?<!\[)`([A-Za-z0-9_\-./]+\.md)`(?!\])/g;

function buildDocIndex() {
  const { config } = loadConfig();
  if ( !config ) return new Map();
  const index = new Map();
  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const mdFiles = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    const remote = gitRemoteOwner( repoPath );
    const branch = gitCurrentBranch( repoPath ) || "main";
    const ownerRepo = remote ? `${remote.owner}/${remote.repo}` : null;
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignorePatterns ) ) continue;
      const basename = path.basename( f.rel );
      const url = ownerRepo ? `https://github.com/${ownerRepo}/blob/${branch}/${f.rel}` : null;
      if ( !index.has( basename ) ) index.set( basename, [] );
      index.get( basename ).push( {
        repo: entry.name,
        repoPath,
        rel:  f.rel,
        full: f.full,
        url,
      } );
    }
  }
  return index;
}

function resolveDocReference( ref, currentRepo, currentDocFull, currentRepoPath, docIndex ) {
  // Path-shaped references: try literal resolution (relative to doc dir, then to repo root,
  // then as <repo-name>/<rest> against the registry).
  if ( ref.includes( "/" ) ) {
    const tries = [
      path.join( path.dirname( currentDocFull ), ref ),
      path.join( currentRepoPath, ref ),
    ];
    for ( const t of tries ) {
      if ( fs.existsSync( t ) && path.resolve( t ) !== path.resolve( currentDocFull ) ) {
        const rel = path.relative( path.dirname( currentDocFull ), t ).replace( /\\/g, "/" );
        return { kind: "relative", target: rel, repo: currentRepo };
      }
    }
    // Try <repo-name>/<rest>: parse the first segment as a registry name.
    const firstSeg = ref.split( "/" )[ 0 ];
    const rest = ref.slice( firstSeg.length + 1 );
    const { config } = loadConfig();
    if ( config ) {
      const namedRepo = config.repos.find( e => e.name === firstSeg );
      if ( namedRepo ) {
        const namedRepoPath = resolveRepoPath( namedRepo );
        if ( namedRepoPath ) {
          const full = path.join( namedRepoPath, rest );
          if ( fs.existsSync( full ) && path.resolve( full ) !== path.resolve( currentDocFull ) ) {
            if ( namedRepo.name === currentRepo ) {
              const rel = path.relative( path.dirname( currentDocFull ), full ).replace( /\\/g, "/" );
              return { kind: "relative", target: rel, repo: namedRepo.name };
            }
            const remote = gitRemoteOwner( namedRepoPath );
            const branch = gitCurrentBranch( namedRepoPath ) || "main";
            if ( remote ) {
              return {
                kind:   "absolute",
                target: `https://github.com/${remote.owner}/${remote.repo}/blob/${branch}/${rest.replace( /\\/g, "/" )}`,
                repo:   namedRepo.name,
              };
            }
          }
        }
      }
    }
    return null;
  }
  const basename = ref;
  if ( LINKS_SKIP_NAMES.has( basename ) ) return null;
  const candidates = ( docIndex.get( basename ) || [] ).filter( c => c.full !== currentDocFull );
  if ( candidates.length === 0 ) return null;
  // Prefer same-repo match
  const sameRepo = candidates.find( c => c.repo === currentRepo );
  if ( sameRepo ) {
    const rel = path.relative( path.dirname( currentDocFull ), sameRepo.full ).replace( /\\/g, "/" );
    return { kind: "relative", target: rel, repo: sameRepo.repo };
  }
  // Cross-repo: prefer cogentia (meta-node) if it carries the basename
  const cogentiaHit = candidates.find( c => c.repo === "cogentia" );
  const chosen = cogentiaHit || candidates[ 0 ];
  if ( !chosen.url ) return null;
  return { kind: "absolute", target: chosen.url, repo: chosen.repo };
}

function findLinkCandidates( content, options ) {
  const includeHeadings = !!options.includeHeadings;
  const includeCode     = !!options.includeCode;
  const lines = content.split( "\n" );
  const out = [];
  let inFence = false;
  for ( let i = 0; i < lines.length; i++ ) {
    const line = lines[ i ];
    if ( /^(```|~~~)/.test( line.trim() ) ) { inFence = !inFence; continue; }
    if ( inFence && !includeCode ) continue;
    if ( /^#{1,6}\s/.test( line ) && !includeHeadings ) continue;
    LINKS_DOC_REF_RE.lastIndex = 0;
    let m;
    while ( ( m = LINKS_DOC_REF_RE.exec( line ) ) !== null ) {
      out.push( { lineIdx: i, lineNum: i + 1, match: m[ 0 ], name: m[ 1 ], col: m.index } );
    }
  }
  return out;
}

function applyLinkRewrites( content, options, mappings ) {
  // mappings: Map<oldText, newText>. We apply only on lines that pass the
  // same filters as findLinkCandidates (no fences, no headings unless overrides).
  const includeHeadings = !!options.includeHeadings;
  const includeCode     = !!options.includeCode;
  const lines = content.split( "\n" );
  let inFence = false;
  for ( let i = 0; i < lines.length; i++ ) {
    const line = lines[ i ];
    if ( /^(```|~~~)/.test( line.trim() ) ) { inFence = !inFence; continue; }
    if ( inFence && !includeCode ) continue;
    if ( /^#{1,6}\s/.test( line ) && !includeHeadings ) continue;
    lines[ i ] = line.replace( LINKS_DOC_REF_RE, ( match, name ) => {
      const repl = mappings.get( match );
      return repl !== undefined ? repl : match;
    } );
  }
  return lines.join( "\n" );
}

function cmdLinks() {
  const isFix = argv.includes( "--fix" );
  const isCheck = !isFix; // default is check
  const includeHeadings = argv.includes( "--include-headings" );
  const includeCode     = argv.includes( "--include-code" );

  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );

  // Positional arg [name|all]: take the first non-flag positional after the command.
  // The command argument has already been consumed by main(); we receive nothing,
  // so search for a positional in argv that isn't a known flag.
  const KNOWN_FLAGS = new Set( [ "--check", "--fix", "--json", "--include-headings", "--include-code" ] );
  let targetRepo = null;
  for ( let i = 0; i < argv.length; i++ ) {
    if ( argv[ i ] === "links" ) {
      const next = argv[ i + 1 ];
      if ( next && !next.startsWith( "--" ) && !KNOWN_FLAGS.has( next ) ) {
        targetRepo = next;
      }
      break;
    }
  }

  const docIndex = buildDocIndex();
  const results = {
    mode:   isFix ? "fix" : "check",
    repos:  {},
    totals: { candidates: 0, resolved: 0, unresolved: 0, applied: 0, files_modified: 0 },
  };

  for ( const entry of config.repos ) {
    if ( targetRepo && targetRepo !== "all" && entry.name !== targetRepo ) continue;
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const mdFiles = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );

    const repoResult = { files: [] };

    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignorePatterns ) ) continue;
      const content = fs.readFileSync( f.full, "utf8" );
      const cands = findLinkCandidates( content, { includeHeadings, includeCode } );
      if ( cands.length === 0 ) continue;

      const fileResult = { file: f.rel, conversions: [] };
      const mappings   = new Map();
      let fileResolved = 0, fileUnresolved = 0;

      for ( const cand of cands ) {
        const resolved = resolveDocReference( cand.name, entry.name, f.full, repoPath, docIndex );
        results.totals.candidates++;
        if ( !resolved ) {
          results.totals.unresolved++;
          fileUnresolved++;
          fileResult.conversions.push( { line: cand.lineNum, name: cand.name, status: "unresolved" } );
          continue;
        }
        results.totals.resolved++;
        fileResolved++;
        const newText = `[\`${cand.name}\`](${resolved.target})`;
        mappings.set( cand.match, newText );
        fileResult.conversions.push( {
          line:        cand.lineNum,
          name:        cand.name,
          status:      "resolved",
          target:      resolved.target,
          kind:        resolved.kind,
          target_repo: resolved.repo,
        } );
      }

      if ( isFix && mappings.size > 0 ) {
        const updated = applyLinkRewrites( content, { includeHeadings, includeCode }, mappings );
        if ( updated !== content ) {
          fs.writeFileSync( f.full, updated, "utf8" );
          // Count actual occurrences replaced, not unique-mapping count
          // (one mapping with a /g regex replaces all occurrences of that ref).
          results.totals.applied += fileResolved;
          results.totals.files_modified++;
        }
      }

      if ( fileResult.conversions.length > 0 ) repoResult.files.push( fileResult );
    }

    if ( repoResult.files.length > 0 ) results.repos[ entry.name ] = repoResult;
  }

  appendAudit( {
    command: isFix ? "links.fix" : "links.check",
    args:    {
      include_headings: includeHeadings,
      include_code:     includeCode,
      target_repo:      targetRepo,
    },
    result:  results.totals,
    narrative: collectNarrative(),
  } );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( results, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( `Links ${isFix ? "fix" : "check"}` )}  ${dim( `(${results.totals.candidates} candidate(s) across ${Object.keys( results.repos ).length} repo(s))` )}\n` );
  for ( const [ repoName, repoResult ] of Object.entries( results.repos ) ) {
    console.log( `  ${bold( repoName )}` );
    for ( const fr of repoResult.files ) {
      const r = fr.conversions.filter( c => c.status === "resolved" ).length;
      const u = fr.conversions.filter( c => c.status === "unresolved" ).length;
      const summary = `${r} resolved${u ? `, ${c.yellow}${u} unresolved${c.reset}` : ""}`;
      console.log( `    ${dim( fr.file )}  ${summary}` );
    }
  }
  console.log();
  console.log( `  ${bold( "totals:" )}` );
  console.log( `    candidates:     ${results.totals.candidates}` );
  console.log( `    resolved:       ${c.green}${results.totals.resolved}${c.reset}` );
  console.log( `    unresolved:     ${results.totals.unresolved ? c.yellow : ""}${results.totals.unresolved}${c.reset}` );
  if ( isFix ) {
    console.log( `    applied:        ${c.cyan}${results.totals.applied}${c.reset}` );
    console.log( `    files modified: ${c.cyan}${results.totals.files_modified}${c.reset}` );
  } else {
    console.log( `    ${dim( `(check mode — re-run with --fix to apply ${results.totals.resolved} conversion(s))` )}` );
  }
  console.log();
}

// ── refresh ───────────────────────────────────────────────────────────────────

function cmdRefresh() {
  const checkOnly = argv.includes( "--check" );
  if ( JSON_MODE ) die( "cogentia refresh does not support --json. Call individual commands with --json instead." );

  console.log( `\n${hdr( checkOnly ? "Corpus refresh (check)" : "Corpus refresh" )}  ${dim( fmtNow() )}\n` );
  console.log( `${dim( "── corpus-status ──" )}` );
  cmdCorpusStatus();

  if ( !checkOnly ) {
    console.log( `\n${dim( "── backlinks ──" )}` );
    cmdBacklinks();
    console.log( `\n${dim( "── trails ──" )}` );
    cmdTrails();
  } else {
    console.log( `\n${dim( "── backlinks / trails — skipped in --check mode (no dry-run support) ──" )}\n` );
  }

  console.log( `${dim( "── documents ──" )}` );
  cmdDocuments();
  console.log( `\n${dim( "All derived views " + ( checkOnly ? "checked." : "refreshed." ) )}\n` );
}


// ── lint ──────────────────────────────────────────────────────────────────────

function cmdLint() {
  const strict = argv.includes( "--strict" );
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found." );

  const result = { timestamp: fmtNow(), strict, repos: [] };
  let anyIssue = false;

  for ( const entry of config.repos ) {
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) { result.repos.push( { name: entry.name, found: false } ); continue; }
    const branch   = gitCurrentBranch( repoPath );
    const upstream = gitUpstream( repoPath, branch );
    const drift    = gitAheadBehind( repoPath, branch, upstream );
    const ignore   = loadIgnore( repoPath );
    const mdFiles  = listMarkdown( repoPath );

    let unrefCount = 0;
    const indexPath = path.join( repoPath, "research", "index.md" );
    if ( fs.existsSync( indexPath ) ) {
      const indexContent = fs.readFileSync( indexPath, "utf8" );
      const referenced   = buildReferencedFileSet( indexPath, indexContent );
      const ignoredSet   = new Set( mdFiles.filter( f => matchesIgnore( f.rel, ignore ) ).map( f => f.rel ) );
      for ( const f of mdFiles ) {
        if ( f.rel === "research/index.md" ) continue;
        if ( ignoredSet.has( f.rel ) ) continue;
        if ( !referenced.has( f.full ) ) unrefCount++;
      }
    }

    let fmPartial = 0, fmLevel1 = 0, fmNoFm = 0, fmDeprecated = 0, fmStatusBad = 0;
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignore ) ) continue;
      if ( isAutoView( f.rel ) ) continue;
      let content = "";
      try { content = fs.readFileSync( f.full, "utf8" ); } catch ( _ ) { continue; }
      const fm = parseFrontmatter( content );
      if ( !fm ) { fmNoFm++; continue; }
      for ( const k of FRONTMATTER_DEPRECATED ) if ( k in fm ) { fmDeprecated++; break; }
      if ( fm.status && !frontmatterCanonicalStatus( fm.status ) ) fmStatusBad++;
      const missingL2 = FRONTMATTER_LEVEL_2_REQUIRED.filter( k => !( k in fm ) );
      if ( missingL2.length === FRONTMATTER_LEVEL_2_REQUIRED.length ) fmLevel1++;
      else if ( missingL2.length > 0 ) fmPartial++;
    }

    const repoData = {
      name: entry.name, found: true, branch, upstream,
      drift: drift ? { ahead: drift.ahead, behind: drift.behind } : null,
      unreferenced: unrefCount,
      frontmatter: {
        partial: fmPartial, level_1_only: fmLevel1, no_frontmatter: fmNoFm,
        deprecated: fmDeprecated, status_bad: fmStatusBad,
      },
    };
    const hardProblem = unrefCount > 0 || fmNoFm > 0 || fmStatusBad > 0 || ( drift && drift.behind > 0 && drift.ahead > 0 );
    const softProblem = fmLevel1 > 0 || fmPartial > 0 || fmDeprecated > 0 || ( drift && ( drift.behind > 0 || drift.ahead > 0 ) );
    if ( hardProblem ) anyIssue = true;
    if ( strict && softProblem ) anyIssue = true;
    result.repos.push( repoData );
  }

  if ( JSON_MODE ) {
    console.log( JSON.stringify( result, null, 2 ) );
    if ( strict && anyIssue ) process.exitCode = 1;
    return;
  }

  console.log( `\n${hdr( "Lint report" )}  ${dim( result.timestamp )}\n` );
  console.log( `  ${dim( pad( "Repository", 17 ) + "  Unref  Frontmatter                              Drift" )}` );
  console.log( `  ${dim( "─".repeat( 86 ) )}` );

  for ( const r of result.repos ) {
    if ( !r.found ) { console.log( `  ${fail( pad( r.name, 17 ) )} — not found on disk` ); continue; }
    const unrefStr = r.unreferenced > 0 ? `${c.yellow}${pad( r.unreferenced, 5, true )}${c.reset}` : `${c.green}${pad( r.unreferenced, 5, true )}${c.reset}`;
    const fm = r.frontmatter;
    const parts = [];
    if ( fm.no_frontmatter > 0 ) parts.push( `${c.red}${fm.no_frontmatter} no-fm${c.reset}` );
    if ( fm.status_bad > 0 )     parts.push( `${c.red}${fm.status_bad} bad-status${c.reset}` );
    if ( fm.level_1_only > 0 )   parts.push( `${c.yellow}${fm.level_1_only} L1${c.reset}` );
    if ( fm.partial > 0 )        parts.push( `${c.yellow}${fm.partial} partial${c.reset}` );
    if ( fm.deprecated > 0 )     parts.push( `${c.yellow}${fm.deprecated} deprec${c.reset}` );
    const fmStr = parts.length === 0 ? `${c.green}clean${c.reset}` : parts.join( " · " );
    let driftStr;
    if ( !r.upstream )                                       driftStr = dim( "no upstream" );
    else if ( !r.drift )                                     driftStr = dim( "—" );
    else if ( r.drift.ahead === 0 && r.drift.behind === 0 )  driftStr = `${c.green}✅ in sync${c.reset}`;
    else if ( r.drift.ahead > 0 && r.drift.behind > 0 )      driftStr = `${c.red}⚡ diverged${c.reset}`;
    else if ( r.drift.behind > 0 )                           driftStr = `${c.yellow}⚠️  ${r.drift.behind} behind${c.reset}`;
    else                                                     driftStr = `${c.cyan}🔼 ${r.drift.ahead} ahead${c.reset}`;

    const fmVisible = fmStr.replace( /\x1b\[[0-9;]*m/g, "" ).length;
    const fmPad     = fmVisible < 48 ? " ".repeat( 48 - fmVisible ) : "";
    console.log( `  ${bold( pad( r.name, 17 ) )}  ${unrefStr}    ${fmStr}${fmPad}  ${driftStr}` );
  }
  console.log();
  if ( strict ) {
    if ( anyIssue ) {
      console.log( `  ${c.red}Strict mode: lint failures present (exit code 1).${c.reset}` );
      process.exitCode = 1;
    } else {
      console.log( `  ${c.green}Strict mode: no lint failures.${c.reset}` );
    }
  } else {
    console.log( `  ${dim( "Local checks only. Run `cogentia check` for external link validation, `cogentia drift` for upstream fetch." )}` );
  }
  console.log();
}


// ── todo + next (fractal scheduler) ──────────────────────────────────────────
//
// Each `.cogentia/SCHEDULE.md` is a sovereign work list at its scope. Views are
// composed by walking the tree. Mirrors the packet-switching topology applied
// to personal cognitive work.

const SCHEDULE_FILE      = "SCHEDULE.md";
const SCHEDULE_SECTIONS  = [ "pending", "active", "deferred", "done" ];
const PRIORITY_ORDER     = { high: 0, medium: 1, low: 2 };
const META_KEY_ORDER     = [ "tags", "refs", "due", "until", "ref", "started", "created", "id" ];

function scheduleShortId() {
  return Math.random().toString( 36 ).slice( 2, 8 );
}

function scheduleParse( content ) {
  const fmMatch     = content.match( /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/ );
  const frontmatter = fmMatch ? parseFrontmatter( content ) : {};
  const body        = fmMatch ? content.slice( fmMatch[ 0 ].length ) : content;
  const items   = [];
  let section   = null;
  let current   = null;

  for ( const line of body.split( /\r?\n/ ) ) {
    const sectMatch = line.match( /^##\s+(Pending|Active|Deferred|Done)\s*$/ );
    if ( sectMatch ) {
      if ( current ) { items.push( current ); current = null; }
      section = sectMatch[ 1 ].toLowerCase();
      continue;
    }
    if ( !section ) continue;

    const itemMatch = line.match( /^-\s+\[( |-|x|X)\]\s+(.*)$/ );
    if ( itemMatch ) {
      if ( current ) items.push( current );
      let title = itemMatch[ 2 ];
      let priority = null;
      const prioMatch = title.match( /^\*\*\[(high|medium|low)\]\*\*\s+/ );
      if ( prioMatch ) { priority = prioMatch[ 1 ]; title = title.slice( prioMatch[ 0 ].length ); }

      let completed = null;
      const doneSuffix = title.match( /^~~([\s\S]*?)~~\s*(?:—\s+(\d{4}-\d{2}-\d{2}))?\s*$/ );
      if ( doneSuffix && section === "done" ) {
        title     = doneSuffix[ 1 ].trim();
        completed = doneSuffix[ 2 ] || null;
      }
      current = { section, priority, title: title.trim(), meta: {} };
      if ( completed ) current.meta.completed = completed;
      continue;
    }
    const metaMatch = line.match( /^\s+-\s+(\w+)\s*:\s*(.+)$/ );
    if ( metaMatch && current ) {
      const key = metaMatch[ 1 ];
      const val = metaMatch[ 2 ].trim();
      if ( key === "tags" ) current.meta.tags = val.split( "," ).map( s => s.trim() ).filter( Boolean );
      else current.meta[ key ] = val;
    }
  }
  if ( current ) items.push( current );
  for ( const item of items ) if ( !item.meta.id ) item.meta.id = scheduleShortId();
  return { frontmatter, items };
}

function scheduleRender( scope, items ) {
  const today = fmtDate( new Date() );
  const lines = [ "---", `scope: ${scope}`, `last_modified_at: ${today}`, "---", "", `# Schedule — ${scope}`, "" ];
  const bySection = { pending: [], active: [], deferred: [], done: [] };
  for ( const item of items ) if ( bySection[ item.section ] ) bySection[ item.section ].push( item );

  const sortByPriority = ( a, b ) => {
    const pa = PRIORITY_ORDER[ a.priority ] !== undefined ? PRIORITY_ORDER[ a.priority ] : 3;
    const pb = PRIORITY_ORDER[ b.priority ] !== undefined ? PRIORITY_ORDER[ b.priority ] : 3;
    if ( pa !== pb ) return pa - pb;
    return ( a.meta.created || "" ).localeCompare( b.meta.created || "" );
  };
  bySection.pending.sort( sortByPriority );
  bySection.active.sort( sortByPriority );
  bySection.deferred.sort( ( a, b ) => ( a.meta.until || "" ).localeCompare( b.meta.until || "" ) );
  bySection.done.sort( ( a, b ) => ( b.meta.completed || "" ).localeCompare( a.meta.completed || "" ) );

  for ( const sect of SCHEDULE_SECTIONS ) {
    const sectItems = bySection[ sect ];
    if ( sectItems.length === 0 ) continue;
    lines.push( "## " + sect.charAt( 0 ).toUpperCase() + sect.slice( 1 ) );
    lines.push( "" );
    for ( const item of sectItems ) {
      const check = sect === "done" ? "x" : sect === "active" ? "-" : " ";
      const prio  = item.priority ? `**[${item.priority}]** ` : "";
      if ( sect === "done" ) {
        const dateSuffix = item.meta.completed ? ` — ${item.meta.completed}` : "";
        lines.push( `- [${check}] ${prio}~~${item.title}~~${dateSuffix}` );
      } else {
        lines.push( `- [${check}] ${prio}${item.title}` );
      }
      const seen = new Set();
      for ( const k of META_KEY_ORDER ) {
        if ( k === "completed" ) continue;
        const v = item.meta[ k ];
        if ( v === undefined || v === null ) continue;
        seen.add( k );
        if ( Array.isArray( v ) ) lines.push( `  - ${k}: ${v.join( ", " )}` );
        else                       lines.push( `  - ${k}: ${v}` );
      }
      for ( const k of Object.keys( item.meta ) ) {
        if ( seen.has( k ) || k === "completed" ) continue;
        const v = item.meta[ k ];
        if ( Array.isArray( v ) ) lines.push( `  - ${k}: ${v.join( ", " )}` );
        else                       lines.push( `  - ${k}: ${v}` );
      }
      lines.push( "" );
    }
  }
  return lines.join( "\n" ).replace( /\n+$/, "\n" );
}

function scheduleResolveRegistryDir() {
  const { configPath } = loadConfig();
  return configPath ? path.dirname( configPath ) : null;
}

function scheduleScopeFromPath( absSchedulePath, workspaceRoot ) {
  const scopeDir = path.dirname( path.dirname( absSchedulePath ) );
  const rel = path.relative( workspaceRoot, scopeDir ).replace( /\\/g, "/" );
  return rel || "workspace";
}

function scheduleFindNearest( cwd ) {
  let dir = path.resolve( cwd );
  const root = path.parse( dir ).root;
  while ( dir !== root ) {
    const candidate = path.join( dir, ".cogentia", SCHEDULE_FILE );
    if ( fs.existsSync( candidate ) ) return candidate;
    dir = path.dirname( dir );
  }
  return null;
}

function scheduleNearestCogentiaDir( cwd ) {
  let dir = path.resolve( cwd );
  const root = path.parse( dir ).root;
  while ( dir !== root ) {
    const candidate = path.join( dir, ".cogentia" );
    if ( fs.existsSync( candidate ) ) return candidate;
    dir = path.dirname( dir );
  }
  return path.join( path.resolve( cwd ), ".cogentia" );
}

function scheduleWalkAll( workspaceRoot ) {
  const found = [];
  const SKIP = new Set( [ ".git", "node_modules", "inseme.worktrees", "dist", "build", ".next", ".turbo" ] );
  function walk( dir ) {
    let entries;
    try { entries = fs.readdirSync( dir, { withFileTypes: true } ); } catch ( _ ) { return; }
    for ( const e of entries ) {
      if ( !e.isDirectory() ) continue;
      if ( SKIP.has( e.name ) ) continue;
      const sub = path.join( dir, e.name );
      if ( e.name === ".cogentia" ) {
        const f = path.join( sub, SCHEDULE_FILE );
        if ( fs.existsSync( f ) ) found.push( f );
      } else {
        walk( sub );
      }
    }
  }
  walk( workspaceRoot );
  return found;
}

function scheduleLoadOne( absPath ) {
  if ( !fs.existsSync( absPath ) ) return { frontmatter: {}, items: [], path: absPath };
  const content = fs.readFileSync( absPath, "utf8" );
  const parsed  = scheduleParse( content );
  parsed.path   = absPath;
  return parsed;
}

function scheduleSaveOne( absPath, scope, items ) {
  const dir = path.dirname( absPath );
  if ( !fs.existsSync( dir ) ) fs.mkdirSync( dir, { recursive: true } );
  fs.writeFileSync( absPath, scheduleRender( scope, items ), "utf8" );
}

function scheduleApplyPolicy( items ) {
  const today = fmtDate( new Date() );
  return items
    .filter( i => i.section === "pending" )
    .sort( ( a, b ) => {
      const pa = PRIORITY_ORDER[ a.priority ] !== undefined ? PRIORITY_ORDER[ a.priority ] : 3;
      const pb = PRIORITY_ORDER[ b.priority ] !== undefined ? PRIORITY_ORDER[ b.priority ] : 3;
      if ( pa !== pb ) return pa - pb;
      const aOver = a.meta.due && a.meta.due <= today;
      const bOver = b.meta.due && b.meta.due <= today;
      if ( aOver !== bOver ) return aOver ? -1 : 1;
      return ( a.meta.created || "" ).localeCompare( b.meta.created || "" );
    } );
}

function renderItemList( items, withScope ) {
  const grouped = { pending: [], active: [], deferred: [], done: [] };
  for ( const i of items ) if ( grouped[ i.section ] ) grouped[ i.section ].push( i );
  for ( const sect of SCHEDULE_SECTIONS ) {
    const sectItems = grouped[ sect ];
    if ( sectItems.length === 0 ) continue;
    const header = sect.charAt( 0 ).toUpperCase() + sect.slice( 1 );
    console.log( `  ${bold( header )}  ${dim( "(" + sectItems.length + ")" )}` );
    for ( const item of sectItems ) {
      const id = item.meta.id || "??????";
      const prio = item.priority === "high"   ? c.red    + "[H]" + c.reset
                 : item.priority === "medium" ? c.yellow + "[M]" + c.reset
                 : item.priority === "low"    ? c.cyan   + "[L]" + c.reset
                 : "   ";
      const scopeStr = withScope && item._scope ? `  ${dim( "(" + item._scope + ")" )}` : "";
      console.log( `    ${dim( id )}  ${prio}  ${item.title}${scopeStr}` );
      const hints = [];
      if ( item.meta.due )   hints.push( `due: ${item.meta.due}` );
      if ( item.meta.until ) hints.push( `until: ${item.meta.until}` );
      if ( item.meta.tags && item.meta.tags.length ) hints.push( "#" + item.meta.tags.join( " #" ) );
      if ( item.meta.ref )   hints.push( `ref: ${item.meta.ref}` );
      if ( hints.length > 0 ) console.log( `            ${dim( hints.join( " · " ) )}` );
    }
    console.log();
  }
}

function cmdTodoList() {
  const useGlobal = argv.includes( "--global" );
  const cwd = process.cwd();
  if ( useGlobal ) {
    const registry = scheduleResolveRegistryDir();
    if ( !registry ) die( "No registry found." );
    const workspaceRoot = path.dirname( registry );
    const paths = scheduleWalkAll( workspaceRoot );
    const all = [];
    for ( const p of paths ) {
      const parsed = scheduleLoadOne( p );
      const scope  = parsed.frontmatter.scope || scheduleScopeFromPath( p, workspaceRoot );
      for ( const item of parsed.items ) all.push( { ...item, _scope: scope, _path: p } );
    }
    if ( JSON_MODE ) { console.log( JSON.stringify( { scope: "global", items: all }, null, 2 ) ); return; }
    const scopes = new Set( all.map( i => i._scope ) ).size;
    console.log( `\n${hdr( "Schedule — global" )}  ${dim( "(" + all.length + " items · " + scopes + " scopes)" )}\n` );
    if ( all.length === 0 ) { console.log( dim( "  No SCHEDULE.md found in the workspace.\n" ) ); return; }
    renderItemList( all, true );
    return;
  }
  const schedulePath = scheduleFindNearest( cwd );
  if ( !schedulePath ) {
    console.log( dim( "No SCHEDULE.md found from " + cwd + " upward. Use `cogentia todo add \"<title>\"` to create one." ) );
    return;
  }
  const parsed = scheduleLoadOne( schedulePath );
  const workspaceRoot = path.dirname( scheduleResolveRegistryDir() || cwd );
  const scope = parsed.frontmatter.scope || scheduleScopeFromPath( schedulePath, workspaceRoot );
  if ( JSON_MODE ) { console.log( JSON.stringify( { scope, path: schedulePath, items: parsed.items }, null, 2 ) ); return; }
  console.log( `\n${hdr( "Schedule — " + scope )}  ${dim( "(" + parsed.items.length + " items)" )}` );
  console.log( `  ${dim( schedulePath )}\n` );
  renderItemList( parsed.items, false );
}

function cmdTodoAdd( title ) {
  if ( !title ) die( "Usage: cogentia todo add \"<title>\" [--priority h|m|l] [--tag t]... [--due YYYY-MM-DD] [--ref <ctn_id>]" );
  const prioRaw = getFlagValue( "--priority" );
  const prioMap = { h: "high", m: "medium", l: "low", high: "high", medium: "medium", low: "low" };
  const priority = prioRaw ? ( prioMap[ prioRaw.toLowerCase() ] || null ) : null;
  const due = getFlagValue( "--due" );
  const ref = getFlagValue( "--ref" );
  const tags = [];
  for ( let i = 0; i < argv.length; i++ ) {
    if ( argv[ i ] === "--tag" && argv[ i + 1 ] ) tags.push( argv[ i + 1 ] );
  }
  const cwd = process.cwd();
  let schedulePath = scheduleFindNearest( cwd );
  let parsed, scope;
  const workspaceRoot = path.dirname( scheduleResolveRegistryDir() || cwd );
  if ( schedulePath ) {
    parsed = scheduleLoadOne( schedulePath );
    scope  = parsed.frontmatter.scope || scheduleScopeFromPath( schedulePath, workspaceRoot );
  } else {
    const cogDir = scheduleNearestCogentiaDir( cwd );
    schedulePath = path.join( cogDir, SCHEDULE_FILE );
    parsed = { frontmatter: {}, items: [] };
    scope  = scheduleScopeFromPath( schedulePath, workspaceRoot );
  }
  const newItem = {
    section: "pending", priority, title,
    meta: { id: scheduleShortId(), created: fmtDate( new Date() ) },
  };
  if ( tags.length > 0 ) newItem.meta.tags = tags;
  if ( due ) newItem.meta.due = due;
  if ( ref ) newItem.meta.ref = ref;
  parsed.items.push( newItem );
  scheduleSaveOne( schedulePath, scope, parsed.items );
  if ( JSON_MODE ) { console.log( JSON.stringify( { added: newItem, scope, path: schedulePath }, null, 2 ) ); return; }
  console.log( `${c.green}✅${c.reset} ${dim( newItem.meta.id )}  ${title}` );
  console.log( `   ${dim( "scope: " + scope + "  ·  " + schedulePath )}` );
  appendAudit( {
    command: "todo add", args: { scope, title, priority, tags, due, ref },
    result: { id: newItem.meta.id, path: schedulePath }, narrative: collectNarrative(),
  } );
}

function cmdTodoSetStatus( shortId, newStatus, extraMeta ) {
  if ( !shortId ) die( `Usage: cogentia todo ${newStatus} <id>` );
  const cwd = process.cwd();
  const registry = scheduleResolveRegistryDir();
  const workspaceRoot = registry ? path.dirname( registry ) : path.dirname( path.resolve( cwd ) );
  let schedulePath = scheduleFindNearest( cwd );
  let parsed = null;
  if ( schedulePath ) {
    parsed = scheduleLoadOne( schedulePath );
    if ( !parsed.items.find( i => i.meta.id === shortId ) ) parsed = null;
  }
  if ( !parsed && registry ) {
    for ( const p of scheduleWalkAll( workspaceRoot ) ) {
      const cand = scheduleLoadOne( p );
      if ( cand.items.find( i => i.meta.id === shortId ) ) { schedulePath = p; parsed = cand; break; }
    }
  }
  if ( !parsed ) die( `Item not found: ${shortId}` );
  const scope = parsed.frontmatter.scope || scheduleScopeFromPath( schedulePath, workspaceRoot );
  const item  = parsed.items.find( i => i.meta.id === shortId );
  item.section = newStatus;
  if ( extraMeta ) Object.assign( item.meta, extraMeta );
  if ( newStatus === "done"  ) item.meta.completed = fmtDate( new Date() );
  if ( newStatus === "active" && !item.meta.started ) item.meta.started = fmtDate( new Date() );
  scheduleSaveOne( schedulePath, scope, parsed.items );
  if ( JSON_MODE ) { console.log( JSON.stringify( { updated: item, scope, path: schedulePath }, null, 2 ) ); return; }
  console.log( `${c.green}✅${c.reset} ${dim( shortId )}  ${item.title} → ${newStatus}` );
  appendAudit( {
    command: "todo " + newStatus, args: { id: shortId, scope },
    result: { id: shortId, newStatus, path: schedulePath }, narrative: collectNarrative(),
  } );
}

function cmdTodo( sub, ...rest ) {
  switch ( sub ) {
    case undefined:
    case "list":   cmdTodoList(); break;
    case "add":    cmdTodoAdd( rest[ 0 ] ); break;
    case "done":   cmdTodoSetStatus( rest[ 0 ], "done" ); break;
    case "defer": {
      const until = getFlagValue( "--until" );
      cmdTodoSetStatus( rest[ 0 ], "deferred", until ? { until } : {} );
      break;
    }
    case "drop":   cmdTodoSetStatus( rest[ 0 ], "done", { dropped: "true" } ); break;
    default:
      die( `Usage: cogentia todo [list | add "<title>" | done <id> | defer <id> [--until <date>] | drop <id>]` );
  }
}

function cmdNext() {
  const useGlobal = argv.includes( "--global" );
  const wantPick  = argv.includes( "--pick" );
  const tagFilter = getFlagValue( "--tag" );
  const limit     = parseInt( getFlagValue( "--limit" ) || "1", 10 );
  const cwd = process.cwd();
  const registry = scheduleResolveRegistryDir();
  const workspaceRoot = registry ? path.dirname( registry ) : path.dirname( path.resolve( cwd ) );
  let items, sourceLabel;

  if ( useGlobal ) {
    const paths = scheduleWalkAll( workspaceRoot );
    items = [];
    for ( const p of paths ) {
      const parsed = scheduleLoadOne( p );
      const scope  = parsed.frontmatter.scope || scheduleScopeFromPath( p, workspaceRoot );
      for ( const it of parsed.items ) items.push( { ...it, _scope: scope, _path: p } );
    }
    sourceLabel = "global";
  } else {
    const schedulePath = scheduleFindNearest( cwd );
    if ( !schedulePath ) { console.log( dim( "No SCHEDULE.md found. Nothing to pick." ) ); return; }
    const parsed = scheduleLoadOne( schedulePath );
    const scope  = parsed.frontmatter.scope || scheduleScopeFromPath( schedulePath, workspaceRoot );
    items = parsed.items.map( it => ( { ...it, _scope: scope, _path: schedulePath } ) );
    sourceLabel = scope;
  }

  let candidates = scheduleApplyPolicy( items );
  if ( tagFilter ) candidates = candidates.filter( i => i.meta.tags && i.meta.tags.includes( tagFilter ) );
  const picks = candidates.slice( 0, limit );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { scope: sourceLabel, picks, picked: wantPick }, null, 2 ) );
    if ( !( wantPick && picks.length > 0 ) ) return;
  }

  if ( !JSON_MODE ) {
    console.log( `\n${hdr( "Next — " + sourceLabel )}${tagFilter ? "  " + dim( "(tag: " + tagFilter + ")" ) : ""}\n` );
    if ( picks.length === 0 ) {
      console.log( dim( "  Nothing pending" + ( tagFilter ? " with tag " + tagFilter : "" ) + ".\n" ) );
      return;
    }
    renderItemList( picks, useGlobal );
  }

  if ( wantPick && picks.length > 0 ) {
    const byPath = new Map();
    for ( const item of picks ) {
      if ( !byPath.has( item._path ) ) byPath.set( item._path, scheduleLoadOne( item._path ) );
      const inFile = byPath.get( item._path ).items.find( i => i.meta.id === item.meta.id );
      if ( inFile ) {
        inFile.section = "active";
        if ( !inFile.meta.started ) inFile.meta.started = fmtDate( new Date() );
      }
    }
    for ( const [ filePath, fileParsed ] of byPath ) {
      const fileScope = fileParsed.frontmatter.scope || scheduleScopeFromPath( filePath, workspaceRoot );
      scheduleSaveOne( filePath, fileScope, fileParsed.items );
    }
    if ( !JSON_MODE ) console.log( `${c.green}✅${c.reset} ${picks.length} item(s) moved to Active.` );
    appendAudit( {
      command: "next --pick", args: { scope: sourceLabel, tag: tagFilter || null, limit },
      result: { picked: picks.map( p => ( { id: p.meta.id, scope: p._scope } ) ) }, narrative: collectNarrative(),
    } );
  } else if ( !JSON_MODE && picks.length > 0 ) {
    console.log( dim( "Tip: " + c.cyan + "cogentia next --pick" + c.reset + dim( " to mark these items as Active." ) ) );
  }
}


// ── AI agent tools ────────────────────────────────────────────────────────────

function cmdQuery( keywordArg ) {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  if ( !keywordArg ) die( "Usage: cogentia query <keyword> [--regex] [--repo <name>]" );
  
  const isRegex = argv.includes( "--regex" );
  const repoFilter = getFlagValue( "--repo" );
  
  let regex;
  if ( isRegex ) {
    try { regex = new RegExp( keywordArg, "gi" ); } catch ( e ) { die( `Invalid regex: ${e.message}` ); }
  } else {
    regex = new RegExp( keywordArg.replace( /[.*+?^${}()|[\\]\\\\]/g, '\\\\$&' ), "gi" );
  }
  
  const results = [];
  
  for ( const entry of config.repos ) {
    if ( repoFilter && entry.name !== repoFilter ) continue;
    const repoPath = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const mdFiles = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    
    for ( const f of mdFiles ) {
      if ( matchesIgnore( f.rel, ignorePatterns ) ) continue;
      const fileContent = fs.readFileSync( f.full, "utf8" );
      const lines = fileContent.split( /\r?\n/ );
      
      for ( let i = 0; i < lines.length; i++ ) {
        if ( regex.test( lines[i] ) ) {
          regex.lastIndex = 0;
          const snippetLines = lines.slice( Math.max( 0, i - 1 ), Math.min( lines.length, i + 2 ) );
          results.push( {
            repo: entry.name,
            file: f.rel,
            full_path: f.full.replace( /\\/g, "/" ),
            line: i + 1,
            snippet: snippetLines.join( "\n" ).trim()
          } );
        }
      }
    }
  }
  
  if ( JSON_MODE ) { console.log( JSON.stringify( { query: keywordArg, is_regex: isRegex, matches: results }, null, 2 ) ); return; }
  
  console.log( `\n${hdr( "Structural Query Engine" )}\n` );
  console.log( `  Searching for: "${keywordArg}" ${isRegex ? "(Regex)" : ""}\n` );
  
  if ( results.length === 0 ) {
    console.log( `  ${dim("No matches found.")}\n` );
    return;
  }
  
  for ( const r of results ) {
    console.log( `  ${bold( r.repo )} : ${c.cyan}${r.file}${c.reset}:${c.yellow}${r.line}${c.reset}` );
    console.log( `    ${dim( r.snippet.replace( /\n/g, "\n    " ) )}\n` );
  }
}

function cmdBundle() {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  
  const conceptFilter = getFlagValue( "--concept" );
  const trailFilter = getFlagValue( "--trail" );
  const repoFilter = getFlagValue( "--repo" );
  const doAll = argv.includes( "--all" );
  
  if ( !conceptFilter && !trailFilter && !repoFilter && !doAll ) {
    die( "Usage: cogentia bundle < --concept <name> | --trail <name> | --repo <name> | --all >" );
  }
  
  const filesToBundle = new Set();
  
  if ( doAll || repoFilter ) {
    for ( const entry of config.repos ) {
      if ( repoFilter && entry.name !== repoFilter ) continue;
      const repoPath = resolveRepoPath( entry );
      if ( !repoPath ) continue;
      const mdFiles = listMarkdown( repoPath );
      const ignorePatterns = loadIgnore( repoPath );
      for ( const f of mdFiles ) {
        if ( !matchesIgnore( f.rel, ignorePatterns ) ) filesToBundle.add( f.full.replace( /\\/g, "/" ) );
      }
    }
  }
  
  if ( conceptFilter ) {
    const loaded = loadAllConcepts( config, null );
    let found = false;
    for ( const r of loaded ) {
      for ( const cpt of r.concepts ) {
        if ( cpt.name.toLowerCase() === conceptFilter.toLowerCase() || cpt.slug === slugifyMarkdownHeading( conceptFilter ) ) {
          found = true;
          const docs = [ ...cpt.reference_documents, ...cpt.used_in ];
          for ( const raw of docs ) {
            const m = String( raw ).match( /`([^`]+)`/ ) || String( raw ).match( /^([^\s]+\.md)(?:\s|$)/ );
            if ( !m ) continue;
            const rel = m[ 1 ];
            if ( rel.startsWith( "http" ) ) continue;
            filesToBundle.add( path.resolve( r.repoPath, rel ).replace( /\\/g, "/" ) );
          }
        }
      }
    }
    if ( !found ) die( `Concept "${conceptFilter}" not found.` );
  }
  
  if ( trailFilter ) {
    for ( const entry of config.repos ) {
      const repoPath = resolveRepoPath( entry );
      if ( !repoPath ) continue;
      const trailsDir = path.join( repoPath, "research", "trails" );
      if ( !fs.existsSync( trailsDir ) ) continue;
      
      for ( const file of fs.readdirSync( trailsDir ) ) {
        if ( !file.endsWith( ".md" ) ) continue;
        const full = path.join( trailsDir, file );
        const content = fs.readFileSync( full, "utf8" );
        const titleMatch = content.match( /^#\s+Trail:\s*(.+)$/m );
        if ( titleMatch && titleMatch[1].trim().toLowerCase() === trailFilter.toLowerCase() ) {
          const linkRegex = /^\s*(?:\d+\.|\*|-)\s+\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/gm;
          let m;
          while ( ( m = linkRegex.exec( content ) ) ) {
            filesToBundle.add( path.resolve( path.dirname( full ), m[2] ).replace( /\\/g, "/" ) );
          }
        }
      }
    }
  }
  
  const blocks = [];
  for ( const fileAbs of filesToBundle ) {
    if ( fs.existsSync( fileAbs ) ) {
      const content = fs.readFileSync( fileAbs, "utf8" );
      const relPathMatch = fileAbs.match(/c:\/tweesic\/([^\/]+)\/(.*)/i);
      const headerTitle = relPathMatch ? `${relPathMatch[1]}/${relPathMatch[2]}` : fileAbs;
      blocks.push( `======================================================================\nFILE: ${headerTitle}\n======================================================================\n${content}\n` );
    }
  }
  
  const finalOutput = blocks.join( "\n" );
  if ( JSON_MODE ) {
    console.log( JSON.stringify( { bundled_files: Array.from( filesToBundle ), content: finalOutput }, null, 2 ) );
  } else {
    console.log( finalOutput );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════


function cmdInstallHooks() {
  const { configPath, config } = loadConfig();
  if ( !configPath ) die( "No registry found. Run: cogentia add <repo> first." );
  const results = [];

  // The hook is a pure Node.js script so it runs identically on Windows,
  // macOS, and Linux.  Git on Windows (Git-for-Windows) will execute any
  // file whose name is exactly "pre-commit" via its bundled sh.exe, but
  // will also pick up "pre-commit.cmd" for native cmd/PowerShell flows.
  // We write BOTH so every Git client is covered.

  for (const entry of config.repos) {
    const repoPath = resolveRepoPath(entry);
    if (!repoPath) continue;
    const hooksDir = path.join(repoPath, ".git", "hooks");
    if (!fs.existsSync(hooksDir)) continue;

    const cogentiaScript = process.argv[1].replace(/\\/g, "/");

    // ── 1. Portable POSIX hook (Git-for-Windows sh.exe, macOS, Linux) ─────
    // Plain shell — avoids ESM/CJS issues entirely since it's not a JS module.
    const posixHook = [
      "#!/bin/sh",
      "# Auto-generated by cogentia.js install-hooks — do not edit by hand",
      `echo "[Cogentia] Running pre-commit checks..."`,
      `node "${cogentiaScript}" status`,
      `if [ $? -ne 0 ]; then`,
      `  echo "[Cogentia] Commit blocked — fix status errors first."`,
      `  exit 1`,
      `fi`,
    ].join("\n") + "\n";

    // ── 2. Windows .cmd twin (native cmd / PowerShell Git clients) ─────────
    const cmdHook = [
      "@echo off",
      ":: Auto-generated by cogentia.js install-hooks — do not edit by hand",
      `node "${cogentiaScript}" status`,
      "if %ERRORLEVEL% neq 0 (",
      "  echo [Cogentia] Commit blocked — fix status errors first.",
      "  exit /b 1",
      ")",
    ].join("\r\n") + "\r\n";

    const preCommitPath    = path.join(hooksDir, "pre-commit");
    const preCommitCmdPath = path.join(hooksDir, "pre-commit.cmd");

    fs.writeFileSync(preCommitPath,    posixHook, { encoding: "utf8", mode: 0o755 });
    fs.writeFileSync(preCommitCmdPath, cmdHook,   { encoding: "utf8" });
    results.push(entry.name);
  }

  if (JSON_MODE) { console.log(JSON.stringify({ hooks_installed: results }, null, 2)); return; }
  console.log(`\n${hdr("Git Hooks Installation")}\n`);
  console.log(`  Installed cross-platform pre-commit hooks (POSIX + .cmd) in ${results.length} repos:`);
  console.log(`  ${results.join(", ")}`);
  console.log();
}

// ── consolidate ───────────────────────────────────────────────────────────────

function cmdConsolidate() {
  appendAudit( {
    command:   "consolidate",
    args:      {},
    result:    { stages: [ "drift", "lint.strict", "refresh.check", "todo.global" ] },
    narrative: collectNarrative(),
  } );

  console.log(`\n${hdr("Corpus Consolidation Report")}  ${dim(fmtNow())}\n`);
  console.log(`${dim("Purpose:")} Prepare the corpus for a clean commit after a period of work.`);
  console.log(`${dim("This runs the key hygiene and propagation checks in a recommended order.")}\n`);

  // 1. Drift
  console.log(`${bold("1. Drift (are all repos in sync?)")}`);
  cmdDrift();

  // 2. Lint (strict)
  console.log(`\n${bold("2. Lint --strict (unreferenced, frontmatter, drift problems)")}`);
  const hadStrict = argv.includes("--strict");
  if (!hadStrict) argv.push("--strict");
  cmdLint();
  if (!hadStrict) {
    const idx = argv.lastIndexOf("--strict");
    if (idx !== -1) argv.splice(idx, 1);
  }

  // 3. Refresh in check mode (derived views)
  console.log(`\n${bold("3. Refresh --check (corpus-status, documents, etc.)")}`);
  const hadCheck = argv.includes("--check");
  if (!hadCheck) argv.push("--check");
  cmdRefresh();
  if (!hadCheck) {
    const idx = argv.lastIndexOf("--check");
    if (idx !== -1) argv.splice(idx, 1);
  }

  // 4. Scheduler items tagged for consolidation (simple heuristic for now)
  console.log(`\n${bold("4. Scheduler items related to consolidation")}`);
  // For v1 we do a best-effort: run todo list --global and let the user filter visually.
  // A more sophisticated filter can be added later (tag:consolidation or section "Ready for Propagation").
  const useGlobal = true; // force global view for consolidation
  if (useGlobal && !argv.includes("--global")) argv.push("--global");
  cmdTodoList();
  if (useGlobal) {
    const idx = argv.lastIndexOf("--global");
    if (idx !== -1) argv.splice(idx, 1);
  }

  console.log(`\n${dim("───────────────────────────────────────────────")}`);
  console.log(`${bold("Consolidation checklist complete.")}`);
  console.log(`${dim("Fix any hard problems (red / strict failures) before running git commit.")}\n`);
}

( async () => {
  switch ( command ) {
    case "query": cmdQuery( cmdArgs[ 0 ] ); break;
    case "bundle": cmdBundle(); break;
    case "init-jekyll": cmdInitJekyll(); break;
    case "backlinks": cmdBacklinks(); break;
    case "trails": cmdTrails(); break;
    case "add":    cmdAdd(    cmdArgs[ 0 ] ); break;
    case "remove": cmdRemove( cmdArgs[ 0 ] ); break;
    case "list":   cmdList();                break;
    case "status": cmdStatus();              break;
    case "scan":   cmdScan();                break;
    case "init":   cmdInit(   cmdArgs[ 0 ] ); break;
    case "ref":    cmdRef(    cmdArgs[ 0 ] ); break;
    case "open":   cmdOpen(   cmdArgs[ 0 ] ); break;
    case "sync":   cmdSync();                break;
    case "drift":  cmdDrift();               break;
    case "graph":  cmdGraph();               break;
    case "check":  await cmdCheck();         break;
    case "jekyll": cmdJekyll();              break;
    case "whoami":         cmdWhoami();                    break;
    case "stamp":          cmdStamp(  cmdArgs[ 0 ] );       break;
    case "corpus-status":  cmdCorpusStatus( cmdArgs[ 0 ] ); break;
    case "documents":      cmdDocuments();                  break;
    case "forks":          await cmdForks( cmdArgs[ 0 ] );  break;
    case "manifest":       cmdManifest();                   break;
    case "install-hooks":  cmdInstallHooks();               break;
    case "state":          cmdState();                      break;
    case "explain-ignore": cmdExplainIgnore( cmdArgs[ 0 ] );break;
    case "frontmatter":    cmdFrontmatter( ...cmdArgs );    break;
    case "refresh":        cmdRefresh();                    break;
    case "lint":           cmdLint();                       break;
    case "links":          cmdLinks();                      break;
    case "consolidate":    cmdConsolidate();                break;
    case "todo":           cmdTodo( ...cmdArgs );           break;
    case "next":           cmdNext();                       break;
    case "concepts":       cmdConcepts( ...cmdArgs );      break;
    case "continuation":   cmdContinuation( ...cmdArgs );  break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      cmdHelp();
      break;
    default:
      die( `Unknown command: "${command}". Run: node scripts/cogentia.js help` );
  }
} )();
