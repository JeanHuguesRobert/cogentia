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
  ${c.cyan}manifest${c.reset}            Print the command manifest (OpenAI-compatible tool
                      definitions for every command). Use ${c.cyan}--json${c.reset} for
                      machine consumption by AI agents.
  ${c.cyan}state${c.reset}               Denormalised JSON snapshot of registry + per-repo
                      status + identity (one call replaces list+status+whoami).
  ${c.cyan}explain-ignore${c.reset} <file>  Report whether a file is matched by .cogentiaignore,
                      and which pattern matched.
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

// ── manifest ──────────────────────────────────────────────────────────────────

/**
 * OpenAI-compatible tool definitions for every command. AI agents (or the
 * inseme Ophélia mediator via cop-host) bind this once to discover the entire
 * CLI surface — same shape inseme briques already use for their `tools` array.
 */
const COGENTIA_JS_VERSION    = "0.4.0";
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
    name: "manifest", description: "Return this command manifest itself (OpenAI-compatible tool definitions for every command).",
    parameters: { type: "object", properties: {} },
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

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

( async () => {
  switch ( command ) {
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
    case "state":          cmdState();                      break;
    case "explain-ignore": cmdExplainIgnore( cmdArgs[ 0 ] );break;
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
