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
 *   help                Show this help
 *
 * Flags:
 *   --json              Output machine-readable JSON (status, scan, graph)
 *
 * Config: .cogentia.json — searched upward from CWD, created on first add.
 *
 * Platform: Linux, macOS, Windows. Zero npm dependencies.
 *
 * Repository: github.com/JeanHuguesRobert/cogentia
 * License: MIT
 */

"use strict";

const fs            = require( "fs"             );
const path          = require( "path"           );
const { execSync }  = require( "child_process"  );
const https         = require( "https"          );
const http          = require( "http"           );

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
const args      = argv.filter( a => !a.startsWith( "--" ) );
const [ command, ...cmdArgs ] = args;

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

function resolveConfigPath( repoPaths ) {
  const existing = findConfig( process.cwd() );
  if ( existing ) return existing;
  const allPaths = [ process.cwd(), ...repoPaths ].map( p => path.resolve( p ) );
  let common = allPaths[ 0 ];
  for ( const p of allPaths.slice( 1 ) ) common = commonAncestor( common, p );
  return path.join( common, CONFIG_FILE );
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
  ${c.cyan}help${c.reset}                Show this help

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
  ${CONFIG_FILE} — searched upward from CWD, created on first ${c.cyan}add${c.reset}.

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
    if ( !JSON_MODE ) console.log( warn( `"${repoName}" is already registered (${existing.path})` ) );
    return;
  }

  const branch = gitCurrentBranch( repoPath );
  config.repos.push( { name: repoName, path: repoPath, branch, added: new Date().toISOString() } );
  saveConfig( configPath, config );

  if ( JSON_MODE ) {
    console.log( JSON.stringify( { added: repoName, path: repoPath, branch }, null, 2 ) );
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
    const indexPath    = path.join( repoPath, "research", "index.md" );
    const indexContent = fs.readFileSync( indexPath, "utf8" );
    const mdFiles      = listMarkdown( repoPath );
    const unreferenced = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
      return !indexContent.includes( path.basename( f.rel ) );
    } );

    result.repos.push( {
      name:              entry.name,
      found:             true,
      branch:            gitCurrentBranch( repoPath ),
      lastCommit:        gitLastCommit( repoPath ),
      totalMarkdown:     mdFiles.length,
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
  console.log( `  ${dim( pad( "Repository", W ) + "  Branch    Last commit   MD files  Unref" )}` );
  console.log( `  ${dim( "─".repeat( 70 ) )}` );

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
    const indexPath    = path.join( repoPath, "research", "index.md" );
    const indexStat    = fs.statSync( indexPath );
    const indexContent = fs.readFileSync( indexPath, "utf8" );
    const mdFiles      = listMarkdown( repoPath );
    const unreferenced = mdFiles.filter( f => {
      if ( f.rel === "research/index.md" ) return false;
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
    } ) );
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

    console.log( `\n${bold( "Markdown files" )} (${mdFiles.length}, newest first):\n` );
    const W_F = 54, W_S = 7, W_D = 10;
    console.log( `  ${dim( pad( "File", W_F ) + "  " + pad( "Size", W_S, true ) + "  Date" )}` );

    for ( const f of mdFiles ) {
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
    } else {
      console.log( `\n${ok( "All markdown files referenced in research/index.md" )}` );
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
