#!/usr/bin/env node
// Contract-level assertions only: PowerShell is not installed on Fracta2.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('./super/approve-cop-effect-windows.ps1',import.meta.url),'utf8');
for(const piece of ['Get-FileHash','ExpectedSha256','ssh -G','ssh-keygen -Y sign','cogentia-super-effect-v1','Read-Host','OUI','scp','expires_at'])assert.ok(s.includes(piece),piece);
assert.match(s,/\[Parameter\(Mandatory=\$true\)\]\[ValidatePattern/);
assert.match(s,/if \(\$sha -ine \$ExpectedSha256\)/);
assert.match(s,/if \(\$decision -cne 'OUI'\)/);
assert.doesNotMatch(s,/\bsudo\b|principal-issuer-client\.mjs\s+(?:issue|run)/);
console.log('PowerShell approval fallback static contract: PASS (runtime requires Windows review)');
