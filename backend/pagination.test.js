import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination } from './src/services/pagination.js';

test('uses safe defaults when pagination is omitted', () => {
  assert.deepEqual(parsePagination({}, 1000), { limit: 100, offset: 0 });
});

test('accepts a valid limit and offset', () => {
  assert.deepEqual(parsePagination({ limit: '25', offset: '200' }, 1000), { limit: 25, offset: 200 });
});

test('rejects invalid limits', () => {
  assert.match(parsePagination({ limit: '0' }, 1000).error, /limit/);
  assert.match(parsePagination({ limit: '1001' }, 1000).error, /limit/);
  assert.match(parsePagination({ limit: 'many' }, 1000).error, /limit/);
});

test('rejects invalid offsets', () => {
  assert.match(parsePagination({ offset: '-1' }, 1000).error, /offset/);
  assert.match(parsePagination({ offset: '1000001' }, 1000).error, /offset/);
  assert.match(parsePagination({ offset: 'many' }, 1000).error, /offset/);
});
