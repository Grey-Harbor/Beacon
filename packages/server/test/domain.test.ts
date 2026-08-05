import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeSourceUrl, deriveSlug, validateResponseHeaders } from '../src/domain.js';

test('canonicalization matches Compactor authority and path rules', () => {
  assert.equal(
    canonicalizeSourceUrl('HTTPS://Example.COM:443/Docs/?from=mail#section'),
    'https://example.com/Docs/',
  );
  assert.equal(canonicalizeSourceUrl('http://Example.COM:80'), 'http://example.com/');
  assert.equal(
    canonicalizeSourceUrl('https://example.com:8443/a/../b'),
    'https://example.com:8443/a/../b',
  );
  assert.notEqual(
    canonicalizeSourceUrl('https://example.com/Docs'),
    canonicalizeSourceUrl('https://example.com/docs'),
  );
});

test('slug derivation is stable and URL safe', () => {
  assert.equal(deriveSlug('https://go.example.com/Product Guides/'), 'product-guides');
  assert.equal(deriveSlug('https://go.example.com/'), 'go-example-com');
});

test('Compactor-owned response headers are rejected', () => {
  assert.throws(() => validateResponseHeaders({ Location: 'https://example.com' }), /controlled/);
  assert.deepEqual(validateResponseHeaders({ 'Cache-Control': 'public, max-age=30' }), {
    'Cache-Control': 'public, max-age=30',
  });
});
