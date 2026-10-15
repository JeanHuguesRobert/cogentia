// Bounded, no-agent filesystem isolation probe. This is NOT a Codex launcher.
// Uses only a minimal Bubblewrap root and does not mount HOME or credentials.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const BIN="/usr/bin/bwrap";
const REPOS=["/srv/cogentia/repos/inseme","/srv/cogentia/repos/cogentia"];
export function readOnlySandboxArgs(repos=REPOS) {
  if (!Array.isArray(repos) || repos.length !== 2 ||
      repos.some((p,i)=>p!==REPOS[i])) throw new Error("untrusted_sandbox_mounts");
  return ["--ro-bind","/usr","/usr","--ro-bind","/etc/ld.so.cache","/etc/ld.so.cache",
    "--symlink","usr/lib","/lib","--symlink","usr/bin","/bin",
    "--proc","/proc","--dev","/dev","--tmpfs","/tmp","--dir","/workspace",
    "--ro-bind",repos[0],"/workspace/inseme",
    "--ro-bind",repos[1],"/workspace/cogentia",
    "--unshare-pid","--unshare-net","--die-with-parent",
    "/usr/bin/python3","-c",
    "import os,socket,json; p='/workspace/inseme/.sandbox-write-test'; "+
    "result={'schema':'cogentia.sandbox-probe/v1','repos_visible':all(os.path.isdir('/workspace/'+r) for r in ('inseme','cogentia'))}; "+
    "\ntry:\n fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600); os.close(fd); os.unlink(p); result['write_denied']=False\nexcept OSError as e: result['write_denied']=e.errno==30\n"+
    "result['home_hidden']=not os.path.exists('/home/ubuntu'); "+
    "\ntry:\n socket.create_connection(('1.1.1.1',443),timeout=2); result['network_denied']=False\nexcept OSError: result['network_denied']=True\n"+
    "print(json.dumps(result))"];
}
export function probeReadOnlySandbox({spawn=spawnSync}={}) {
  if(!existsSync(BIN)) return {status:"BLOCKED",reason:"bwrap_missing"};
  const res=spawn(BIN,readOnlySandboxArgs(),{encoding:"utf8",timeout:7000,maxBuffer:8192,env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent"}});
  let evidence;
  try {evidence=JSON.parse(res.stdout.trim());}catch{ return {status:"BLOCKED",reason:"sandbox_probe_failed",exit_code:res.status}; }
  const ok=res.status===0&&evidence.schema==="cogentia.sandbox-probe/v1"&&
    evidence.repos_visible===true&&evidence.write_denied===true&&
    evidence.home_hidden===true&&evidence.network_denied===true;
  return {status:ok?"PASS":"BLOCKED",evidence,execution_authorized:false,agent_spawned:false};
}
