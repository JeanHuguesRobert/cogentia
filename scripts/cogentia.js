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
 *   node cogentia.js <command> [args] [--json]
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

/** Extract cross-repo references from a research/index.md */
function extractCrossRefs( indexPath, repoName, allRepoNames ) {
  const refs = [];
  if ( !fs.existsSync( indexPath ) ) return refs;
  const content = fs.readFileSync( indexPath, "utf8" );
  const links   = extractLinks( content );
  for ( const link of links ) {
    for ( const name of allRepoNames ) {
      if ( name === repoName ) continue;
      if ( link.url.includes( `/${name}/` ) || link.url.includes( `/${name}` ) ) {
        if ( !refs.includes( name ) ) refs.push( name );
      }
    }
  }
  return refs;
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
  const absPath = path.resolve( filePath );
  if ( !fs.existsSync( absPath ) ) {
    return { ok: false, file: filePath, reason: "not found" };
  }

  const { configPath, config } = loadConfig();
  if ( !configPath ) {
    return { ok: false, file: filePath, reason: "no registry" };
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

function buildGraphBlock( config ) {
  const allNames = config.repos.map( r => r.name );
  const edges = [];
  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    if ( !repoPath ) continue;
    const indexPath = path.join( repoPath, "research", "index.md" );
    if ( !fs.existsSync( indexPath ) ) continue;
    const refs = extractCrossRefs( indexPath, entry.name, allNames );
    for ( const r of refs ) edges.push( { from: entry.name, to: r } );
  }
  const lines = [ "```mermaid", "graph LR" ];
  for ( const n of allNames ) lines.push( `  ${n}["📄 ${n}"]` );
  for ( const e of edges ) lines.push( `  ${e.from} --> ${e.to}` );
  lines.push( "```" );
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
    `repository: "github.com/${repoSlug}"`,
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
  node cogentia.js <command> [args] [--json]

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
  ${c.cyan}continuation${c.reset} <sub>   Typed, resumable judgment points (cogentia.continuation.v1).
                      Sub: ${c.cyan}emit${c.reset} <task.json> [--paper <f>|--topic <id>|--from <id>]
                           ${c.cyan}inspect${c.reset} <id>
                           ${c.cyan}resume${c.reset} <id> <step_result.json> [--strict]
                           ${c.cyan}fail${c.reset} <id> <branch-id> --reason "..."
                           ${c.cyan}abort${c.reset} <id> --reason "..."
                           ${c.cyan}queue${c.reset} [--status active|completed|aborted|dormant]
                           ${c.cyan}schema${c.reset}
  ${c.cyan}help${c.reset}                Show this help

${bold( "Global flags:" )}
  ${c.cyan}--registry${c.reset} <path>          Use this .cogentia.json (or its directory).
                              Also honours ${c.cyan}COGENTIA_REGISTRY${c.reset} env var.
  ${c.cyan}--cwd${c.reset} <path>               Change working directory before running.
  ${c.cyan}--narrative-short${c.reset} <text>   Short description; appended to ${AUDIT_DIR}/${AUDIT_FILE}.
  ${c.cyan}--narrative-long${c.reset} <text>    Long description / reasoning.
  ${c.cyan}--chat-url${c.reset} <url>           Conversational-agent session URL (repeatable).

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
    const mdFiles        = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
    const ignoredSet     = new Set( ignored.map( f => f.rel ) );
    const unreferenced   = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
      if ( ignoredSet.has( f.rel ) ) return false;
      return !indexContent.includes( path.basename( f.rel ) );
    } );

    result.repos.push( {
      name:              entry.name,
      found:             true,
      branch:            gitCurrentBranch( repoPath ),
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
  console.log( `  ${dim( pad( "Repository", W ) + "  Branch    Last commit   MD files  Ignored  Unref" )}` );
  console.log( `  ${dim( "─".repeat( 78 ) )}` );

  for ( const r of result.repos ) {
    if ( !r.found ) {
      console.log( `  ${fail( pad( r.name, W ) )} — not found on disk` );
      continue;
    }
    const unrefColor = r.unreferencedCount > 0 ? c.yellow : c.green;
    const unref      = `${unrefColor}${r.unreferencedCount}${c.reset}`;
    const boot       = r.indexBootstrapped ? ` ${info( "bootstrapped" )}` : "";
    console.log(
      `  ${bold( pad( r.name, W ) )}  ` +
      `${dim( pad( r.branch || "", 9 ) )}  ` +
      `${dim( r.lastCommit || "         " )}    ` +
      `${pad( r.totalMarkdown, 4, true )}      ` +
      `${dim( pad( r.ignoredCount, 4, true ) )}    ` +
      `${unref}${boot}`
    );
  }
  console.log();
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
    const mdFiles        = listMarkdown( repoPath );
    const ignorePatterns = loadIgnore( repoPath );
    const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
    const ignoredSet     = new Set( ignored.map( f => f.rel ) );
    const unreferenced   = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
      if ( ignoredSet.has( f.rel ) ) return false;
      return !indexContent.includes( path.basename( f.rel ) );
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
      referenced: f.rel === "research/index.md" || indexContent.includes( path.basename( f.rel ) ),
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
      const isRef   = isIndex || indexContent.includes( path.basename( f.rel ) );
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

// ── graph ─────────────────────────────────────────────────────────────────────

function cmdGraph() {
  const { configPath, config } = loadConfig();
  if ( !configPath || config.repos.length === 0 ) die( "No repos registered." );

  const allNames = config.repos.map( r => r.name );
  const edges    = [];
  const nodes    = [];

  for ( const entry of config.repos ) {
    const repoPath  = resolveRepoPath( entry );
    const indexPath = repoPath ? path.join( repoPath, "research", "index.md" ) : null;
    const hasIndex  = indexPath && fs.existsSync( indexPath );
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

  // Generate Mermaid diagram + Markdown page
  const lines = [];
  lines.push( "# Cogentia Commons — Corpus Graph" );
  lines.push( "" );
  lines.push( `*Generated: ${fmtNow()}*` );
  lines.push( "" );
  lines.push( "```mermaid" );
  lines.push( "graph LR" );

  for ( const node of nodes ) {
    const label = node.hasIndex
      ? `${node.name}["📄 ${node.name}"]`
      : `${node.name}["⚠️ ${node.name}"]`;
    lines.push( `  ${label}` );
  }

  for ( const edge of edges ) {
    lines.push( `  ${edge.from} --> ${edge.to}` );
  }

  lines.push( "```" );
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
  lines.push( `*${edges.length} cross-reference(s) detected across ${nodes.length} repo(s).*` );

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
  for ( const r of loaded ) {
    for ( const concept of r.concepts ) {
      nodes.push( { id: conceptGraphId( concept.name ), slug: concept.slug, name: concept.name, repo: r.name, scope: concept.scope, status: concept.status } );
      for ( const p of concept.parents ) addEdge( p, concept.name, "parent" );
      for ( const ch of concept.children ) addEdge( concept.name, ch, "child" );
      for ( const rel of concept.related ) addEdge( concept.name, rel, "related" );
    }
  }
  const lines = [ "```mermaid", "graph LR" ];
  const nodeIds = new Set( nodes.map( n => n.id ) );
  for ( const n of nodes ) lines.push( `  ${n.id}["${n.name}"]` );
  for ( const e of edges ) {
    if ( !nodeIds.has( e.from ) ) lines.push( `  ${e.from}["${e.from.replace( /^c_/, "" ).replace( /_/g, " " )}"]` );
    if ( !nodeIds.has( e.to ) )   lines.push( `  ${e.to}["${e.to.replace( /^c_/, "" ).replace( /_/g, " " )}"]` );
    nodeIds.add( e.from ); nodeIds.add( e.to );
    const arrow = e.label === "related" ? "-.->" : "-->";
    lines.push( `  ${e.from} ${arrow} ${e.to}` );
  }
  lines.push( "```" );
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
  const daysArg = getFlagValue("--days") || "30";
  const days = parseInt(daysArg, 10);
  if (isNaN(days)) die(`Invalid days: ${daysArg}`);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const all = listContinuations();
  const toDelete = all.filter(c => (c.status === "aborted" || c.status === "dormant") && (c.createdAt || c.abortedAt) < cutoff);
  
  for (const c of toDelete) {
      fs.unlinkSync(continuationPath(c.id));
  }
  
  if (JSON_MODE) { console.log(JSON.stringify({ pruned: toDelete.length, days }, null, 2)); return; }
  console.log(`\n${hdr("Continuation Garbage Collection")}\n`);
  console.log(`  ${bold("pruned:")} ${toDelete.length} continuations older than ${days} days.`);
  console.log();
}

function cmdContinuationQueue() {
  const filterStatus = getFlagValue( "--status" );
  const all = listContinuations();
  const filtered = filterStatus
    ? all.filter( cnt => cnt.status === filterStatus )
    : all;
  filtered.sort( ( a, b ) => ( a.createdAt || "" ).localeCompare( b.createdAt || "" ) );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( filtered, null, 2 ) );
    return;
  }
  console.log( `\n${hdr( "Continuation queue" )}  ${dim( filterStatus ? `(status=${filterStatus})` : "(all)" )}\n` );
  if ( filtered.length === 0 ) {
    console.log( `  ${dim( "No continuations match." )}\n` );
    return;
  }
  console.log( `  ${dim( pad( "id", 16 ) + pad( "status", 12 ) + pad( "task", 32 ) + "topic" )}` );
  for ( const cnt of filtered ) {
    const colorStart =
        cnt.status === "active"    ? c.cyan
      : cnt.status === "completed" ? c.green
      : cnt.status === "aborted"   ? c.red
      : cnt.status === "dormant"   ? c.dim
      :                              "";
    console.log(
      "  " + pad( cnt.id, 16 ) +
      colorStart + pad( cnt.status, 12 ) + c.reset +
      pad( cnt.task || "(dormant)", 32 ) +
      ( cnt.topicId || "" ),
    );
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
    case "emit":    cmdContinuationEmit(    rest[ 0 ] );             break;
    case "inspect": cmdContinuationInspect( rest[ 0 ] );             break;
    case "resume":  cmdContinuationResume(  rest[ 0 ], rest[ 1 ] );  break;
    case "fail":    cmdContinuationFail(    rest[ 0 ], rest[ 1 ] );  break;
    case "abort":   cmdContinuationAbort(   rest[ 0 ] );             break;
    case "queue":   cmdContinuationQueue();                          break;
    case "prune":   cmdContinuationPrune();                          break;
    case "schema":  cmdContinuationSchema();                         break;
    case undefined:
      die( "Usage: cogentia continuation <emit|inspect|resume|fail|abort|queue|prune|schema> ..." );
      break;
    default:
      die( `Unknown continuation subcommand: "${sub}". Try: emit, inspect, resume, fail, abort, queue, prune, schema.` );
  }
}

// ── manifest ──────────────────────────────────────────────────────────────────

/**
 * OpenAI-compatible tool definitions for every command. AI agents (or the
 * inseme Ophélia mediator via cop-host) bind this once to discover the entire
 * CLI surface — same shape inseme briques already use for their `tools` array.
 */
const COGENTIA_JS_VERSION    = "0.9.0";
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
    name: "continuation", description: "Emit/inspect/resume/fail/abort/queue typed continuation requests — cogentia.continuation.v1, a provider-neutral protocol for surfacing missing judgment as serializable, schema-bearing, resumable objects across process boundaries. See research/agent_resumable_cli.md.",
    parameters: {
      type: "object",
      properties: {
        subcommand:       { type: "string", enum: [ "emit", "inspect", "resume", "fail", "abort", "queue", "prune", "schema" ], description: "Continuation operation to perform." },
        task_file:        { type: "string", description: "Path to a JSON task descriptor (emit)." },
        id:               { type: "string", description: "Continuation id (inspect/resume/fail/abort)." },
        step_result_file: { type: "string", description: "Path to a step_result JSON (resume)." },
        branch_id:        { type: "string", description: "Alternative id (fail)." },
        paper:            { type: "string", description: "Optional --paper <file>: derive topicId from the document's path inside its owning repo." },
        topic:            { type: "string", description: "Optional --topic <urn>: override topic explicitly." },
        from:             { type: "string", description: "Optional --from <id>: activate a dormant successor in place." },
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
        const mdFiles        = listMarkdown( repoPath );
        const ignorePatterns = loadIgnore( repoPath );
        const ignored        = mdFiles.filter( f => matchesIgnore( f.rel, ignorePatterns ) );
        const ignoredSet     = new Set( ignored.map( f => f.rel ) );
        const unreferenced   = mdFiles.filter( f => {
          if ( f.rel === "research/index.md" ) return false;
          if ( ignoredSet.has( f.rel ) )       return false;
          return !indexContent.includes( path.basename( f.rel ) );
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
      if ( !titleMatch ) continue;
      const trailName = titleMatch[1].trim();
      
      const items = [];
      const linkRegex = /^\s*(?:\d+\.|\*|-)\s+\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/gm;
      let m;
      while ( ( m = linkRegex.exec( content ) ) ) {
        const linkTitle = m[1];
        const linkPath = m[2];
        const targetAbs = path.resolve( path.dirname( full ), linkPath );
        if ( fs.existsSync( targetAbs ) ) {
          items.push( { title: linkTitle, fullPath: targetAbs, relFromTrail: linkPath } );
        }
      }
      
      if ( items.length > 0 ) {
        trails.push( { repo: entry.name, name: trailName, source: full, items } );
      }
    }
  }
  
  const fileUpdates = new Map();
  for ( const trail of trails ) {
    for ( let i = 0; i < trail.items.length; i++ ) {
      const item = trail.items[i];
      const prev = i > 0 ? trail.items[i - 1] : null;
      const next = i < trail.items.length - 1 ? trail.items[i + 1] : null;
      
      let block = `> 🧭 **Trail: ${trail.name}**\n> `;
      const parts = [];
      if ( prev ) {
        const relPrev = path.relative( path.dirname( item.fullPath ), prev.fullPath ).replace( /\\/g, "/" );
        parts.push( `⬅️ Previous: [${prev.title}](${relPrev})` );
      }
      if ( next ) {
        const relNext = path.relative( path.dirname( item.fullPath ), next.fullPath ).replace( /\\/g, "/" );
        parts.push( `➡️ Next: [${next.title}](${relNext})` );
      }
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
    const posixHook = [
      "#!/usr/bin/env node",
      "// Auto-generated by cogentia.js install-hooks — do not edit by hand",
      `import { execFileSync } from "node:child_process";`,
      `try {`,
      `  process.stdout.write("[Cogentia] Running pre-commit checks...\\n");`,
      `  execFileSync(process.execPath, [${JSON.stringify(cogentiaScript)}, "status"],`,
      `               { stdio: "inherit" });`,
      `} catch (_) {`,
      `  process.stdout.write("[Cogentia] Commit blocked — fix status errors first.\\n");`,
      `  process.exit(1);`,
      `}`,
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
    case "graph":  cmdGraph();               break;
    case "check":  await cmdCheck();         break;
    case "jekyll": cmdJekyll();              break;
    case "whoami":         cmdWhoami();                    break;
    case "stamp":          cmdStamp(  cmdArgs[ 0 ] );       break;
    case "corpus-status":  cmdCorpusStatus( cmdArgs[ 0 ] ); break;
    case "manifest":       cmdManifest();                   break;
    case "install-hooks":  cmdInstallHooks();               break;
    case "state":          cmdState();                      break;
    case "explain-ignore": cmdExplainIgnore( cmdArgs[ 0 ] );break;
    case "concepts":       cmdConcepts( ...cmdArgs );      break;
    case "continuation":   cmdContinuation( ...cmdArgs );  break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      cmdHelp();
      break;
    default:
      die( `Unknown command: "${command}". Run: node cogentia.js help` );
  }
} )();
