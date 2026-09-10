import test from 'node:test'; import assert from 'node:assert/strict'; import { parseCsvText, transformValue } from '../scripts/csv-utils.js';
test('parses quoted commas',()=>{const rows=parseCsvText('a,b\n"x,y",z\n');assert.deepEqual(rows,[['a','b'],['x,y','z']])});
test('splits pipe lists',()=>assert.deepEqual(transformValue('540E|540|1000',{type:'list'}),['540E','540','1000']));
test('preserves descriptive flex value',()=>assert.equal(transformValue('30390 / 31751 (HDS)',{type:'flex'}),'30390 / 31751 (HDS)'));
