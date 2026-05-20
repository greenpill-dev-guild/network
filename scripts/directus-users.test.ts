import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs, parseInviteUsers, splitDisplayName } from './directus-users.ts';

test('parseInviteUsers reads steward TSV rows without treating location commas as separators', () => {
  const users = parseInviteUsers([
    'email\tname\tlocation\trole',
    'alwynvanwyk@gmail.com\tAlwyn Anwyk\tCape Town, South Africa\t',
    'matt@greenpill.builders\tMatt Strachman\tNew York City\tGreenpill Operator',
  ].join('\n'));

  assert.deepEqual(users, [
    {
      email: 'alwynvanwyk@gmail.com',
      name: 'Alwyn Anwyk',
      location: 'Cape Town, South Africa',
      role: '',
    },
    {
      email: 'matt@greenpill.builders',
      name: 'Matt Strachman',
      location: 'New York City',
      role: 'Greenpill Operator',
    },
  ]);
});

test('parseInviteUsers rejects duplicate normalized emails', () => {
  assert.throws(
    () => parseInviteUsers('AFO@example.com\tAfo\n afo@example.com\tAfo'),
    /Duplicate invite email: afo@example.com/
  );
});

test('splitDisplayName maps the first token to first name and the rest to last name', () => {
  assert.deepEqual(splitDisplayName('Caue Tomaz'), {
    firstName: 'Caue',
    lastName: 'Tomaz',
  });
  assert.deepEqual(splitDisplayName('Heenal'), {
    firstName: 'Heenal',
    lastName: undefined,
  });
});

test('parseArgs keeps normal steward and admin roles explicit', () => {
  const options = parseArgs([
    '--input',
    '/tmp/stewards.tsv',
    '--admin',
    'Matt@Greenpill.Builders',
  ]);

  assert.equal(options.input, '/tmp/stewards.tsv');
  assert.equal(options.role, 'Greenpill Steward Editor');
  assert.equal(options.adminRole, 'Greenpill Operator');
  assert.equal(options.admins.has('matt@greenpill.builders'), true);
});
