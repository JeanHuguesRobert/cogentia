/**
 * #299 — effect-specific adapters, not an arbitrary host shell.
 * The operator's Cloudflare secret stays in the Windows PowerShell process.
 */
import {execFile as execFileCallback} from "node:child_process";
import {promisify} from "node:util";
import {readlink} from "node:fs/promises";
import {MUSEUM_DNS,MUSEUM_RELEASE} from "./john-standing-technical-effects.js";
const execFile=promisify(execFileCallback);
const DNS_COMMIT="ed6abbe0f75c2733a5102fdd9378dd14824281c8";
const DNS_DIGEST="4ad0c9fe367f0639f002797bcd0eec81aa4a52b50e1db21345b8cd0ea2d9ee5c";
const STATIC_HELPER="/usr/local/libexec/cogentia/museum-static-release";
const SITE_LINK="/srv/www/musee/current";
const fail=reason=>({ok:false,verified:false,reason,
  receipt:{status:"failed",reason}});
async function execute(file,args,{timeout=18000,maxBuffer=4096}={}){
  return execFile(file,args,{timeout,maxBuffer,encoding:"utf8",
    env:{PATH:process.env.PATH||"/usr/bin:/bin",HOME:process.env.HOME||"/home/ubuntu",LANG:"C"}});
}
async function authoritative() {
  return Promise.all(["viddy.ns.cloudflare.com","josephine.ns.cloudflare.com"].map(async ns=>{
    const {stdout}=await execute("dig",["+short","@"+ns,
      MUSEUM_DNS.name,"CNAME"],{timeout:5500});
    return String(stdout).trim().toLowerCase().replace(/[.]$/,"");
  }));
}
function powerShellScript() {
  const sourceUrl="https://raw.githubusercontent.com/JeanHuguesRobert/operium/"+
    DNS_COMMIT+"/scripts/provision-kys-services-dns.mjs";
  const script = `
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$f=Join-Path $env:TEMP ('cop-dns-'+[guid]::NewGuid().ToString('N')+'.mjs')
try {
 if($env:COMPUTERNAME -ine 'I7-THINKPAD-JHR'){throw 'wrong_host'}
 $conf='C:\\tweesic\\inseme\\.env'
 if(!(Test-Path -LiteralPath $conf)){throw 'missing_secret_source'}
 $line=Get-Content -LiteralPath $conf | Where-Object {$_.StartsWith('CLOUDFLARE_API_KEY=')} | Select-Object -First 1
 if(!$line){throw 'missing_secret'}
 $env:CLOUDFLARE_API_KEY=$line.Substring('CLOUDFLARE_API_KEY='.Length).Trim().Trim([char]34).Trim([char]39)
 Invoke-WebRequest -Uri '@SOURCE_URL@' -OutFile $f -UseBasicParsing -TimeoutSec 12 | Out-Null
 if((Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant() -cne '@DIGEST@'){throw 'source_changed'}
 & node $f '--site=museum' '--apply' | Out-Null
 if($LASTEXITCODE -ne 0){throw 'cloudflare_provisioner_refused'}
 Write-Output 'COP_DNS_PROVIDER=SUCCESS'
} catch {
 Write-Output ('COP_DNS_PROVIDER=FAIL TYPE='+$_.Exception.GetType().Name)
 exit 1
} finally {
 Remove-Item Env:\\CLOUDFLARE_API_KEY -ErrorAction SilentlyContinue
 if(Test-Path $f){Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue}
}
`;
  return script.replace("@SOURCE_URL@",sourceUrl).replace("@DIGEST@",DNS_DIGEST);
}
export function createStandingTechnicalProviders({
  run=execute,readCname=authoritative,readSite=readlink,
  probe=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(8000)});
    return r.status===200 ? await r.text():null;},
}={}) {
  return Object.freeze({
    dnsProvider:{
      async ensure(effect){
        if(!effect||Object.entries(MUSEUM_DNS).some(([key,value])=>effect[key]!==value))
          return fail("dns_provider_effect_mismatch");
        let records;
        try{records=await readCname();}catch{return fail("dns_authoritative_read_failed");}
        if(!Array.isArray(records)||records.length!==2)return fail("dns_authoritative_read_incomplete");
        const expected=MUSEUM_DNS.content;
        if(records.some(value=>value!==""&&value!==expected))return fail("dns_authoritative_conflict");
        const existed=records.every(value=>value===expected);
        if(!existed) {
          const script=powerShellScript();
          try{
            const {stdout}=await run("ssh",[
              "-o","BatchMode=yes","-o","ConnectTimeout=8",
              "thinkpad","powershell.exe","-NoProfile","-NonInteractive",
              "-EncodedCommand",Buffer.from(script,"utf16le").toString("base64"),
            ],{timeout:45000,maxBuffer:2048});
            if(!String(stdout).includes("COP_DNS_PROVIDER=SUCCESS"))
              return fail("cloudflare_provider_unverified");
          }catch{return fail("cloudflare_provider_unreachable_or_refused");}
          try{records=await readCname();}catch{return fail("dns_readback_unavailable");}
        }
        if(!records.every(value=>value===expected))
          return fail("dns_authoritative_readback_mismatch");
        return {ok:true,verified:true,changed:!existed,
          receipt:{status:"success",provider:"cloudflare",name:effect.name,
            type:"CNAME",target:expected,dns_only:true,authoritative_servers:2,
            changed:!existed}};
      },
    },
    siteProvider:{
      async release(effect){
        if(!effect||Object.entries(MUSEUM_RELEASE).some(([key,value])=>effect[key]!==value))
          return fail("static_provider_effect_mismatch");
        const expected="releases/"+MUSEUM_RELEASE.revision;
        let current="";
        try{current=await readSite(SITE_LINK);}catch{}
        const existed=current===expected;
        if(!existed){
          try{await run("sudo",["-n",STATIC_HELPER],{timeout:95000,maxBuffer:2048});}
          catch{return fail("static_root_helper_unavailable");}
          try{current=await readSite(SITE_LINK);}catch{return fail("static_release_readback_unavailable");}
        }
        if(current!==expected)return fail("static_release_revision_mismatch");
        let html;
        try{html=await probe("https://museum.baronsmariani.org/boutique.html");}
        catch{return fail("static_public_https_probe_failed");}
        if(!html||!html.includes("Boutique"))
          return fail("static_public_content_unverified");
        return {ok:true,verified:true,changed:!existed,
          receipt:{status:"success",provider:"operium-static",host:effect.host,
            repository:effect.repository,revision:effect.revision,
            https:true,boutique_verified:true,changed:!existed}};
      },
    },
  });
}
