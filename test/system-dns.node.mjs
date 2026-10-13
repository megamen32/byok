// Focused integration; expected1s/max5s. Detect DNS bypass and private-IP acceptance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { syncBuiltinESMExports } from 'node:module';

test('default validation follows system lookup and preserves public-IP checks', async () => {
  const originalLookup=dns.lookup, originalResolver=dns.Resolver;
  const queries=[];let resolvers=0;
  try {
    dns.lookup=async (hostname,options) => { queries.push({hostname,options});return [{address:'93.184.216.34',family:4}]; };
    dns.Resolver=class {constructor(){resolvers++;throw new Error('Explicit DNS resolver bypassed system configuration');}};
    syncBuiltinESMExports();
    const {assertSafeProviderUrl}=await import('../dist/index.js');
    assert.equal(await assertSafeProviderUrl('https://system-dns-only.example/v1/'),'https://system-dns-only.example/v1');
    assert.deepEqual(queries,[{hostname:'system-dns-only.example',options:{all:true}}]);
    assert.equal(resolvers,0);
    dns.lookup=async () => [{address:'10.0.0.2',family:4}];syncBuiltinESMExports();
    await assert.rejects(assertSafeProviderUrl('https://private-dns.example/v1'),/публичный адрес/);
  } finally {dns.lookup=originalLookup;dns.Resolver=originalResolver;syncBuiltinESMExports();}
});
