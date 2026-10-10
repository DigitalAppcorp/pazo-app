import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Deterministic abstraction of transactional lock acquisition.
// This is NOT a PostgreSQL connection, trigger, FK, or RLS integration test.
function runSchedule(sequences) {
  const held = new Map();
  const acquired = sequences.map(() => new Set());
  const next = sequences.map(() => 0);
  let steps = 0;
  while (steps++ < 1000) {
    if (next.every((n, i) => n === sequences[i].length)) {
      return { deadlock: false, steps };
    }
    let madeProgress = false;
    for (let i = 0; i < sequences.length; i++) {
      if (next[i] === sequences[i].length) continue;
      const lock = sequences[i][next[i]];
      const owner = held.get(lock);
      if (owner !== undefined && owner !== i) continue;
      held.set(lock, i);
      acquired[i].add(lock);
      next[i]++;
      madeProgress = true;
      if (next[i] === sequences[i].length) {
        for (const key of acquired[i]) held.delete(key);
      }
    }
    if (!madeProgress) return { deadlock: true, steps };
  }
  throw new Error('Unexpected livelock in lock model');
}

test('legacy Feed has cycle witness: metrics before A3 versus A3 before metrics', () => {
  assert.equal(runSchedule([
    ['metric:pet-a', 'a3:owner-b'],
    ['a3:owner-b', 'metric:pet-a']
  ]).deadlock, true);
});

test('A3 Feed draft removes this specific metric/account cycle', () => {
  assert.equal(runSchedule([
    ['a3:owner-b', 'metric:pet-a'],
    ['a3:owner-b', 'metric:pet-a']
  ]).deadlock, false);
});

test('A3 UUID ordering avoids the reversed actor/target account cycle', () => {
  assert.equal(runSchedule([
    ['a3:owner-a', 'a3:owner-b', 'metric:pet-a'],
    ['a3:owner-a', 'a3:owner-b', 'metric:pet-b']
  ]).deadlock, false);
  assert.equal(runSchedule([
    ['a3:owner-a', 'a3:owner-b'],
    ['a3:owner-b', 'a3:owner-a']
  ]).deadlock, true);
});

test('model matches the versioned draft and the original comment side effects', () => {
  const sql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql', import.meta.url),'utf8');
  const comments = readFileSync(new URL('../supabase/migrations/20261005110000_post_comments_source_of_truth.sql', import.meta.url),'utf8');
  const fence = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql', import.meta.url),'utf8');
  const func = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.register_interaction_signal'));
  const start = func.indexOf('pg_catalog.pg_advisory_xact_lock');
  const firstMetric = func.indexOf('INSERT INTO public.pet_private_metrics');
  const firstInteraction = func.indexOf('INSERT INTO public.interactions');
  assert.ok(start > 0 && start < firstMetric && start < firstInteraction);
  assert.match(func,/SELECT DISTINCT uid[\s\S]*?WHERE uid IS NOT NULL ORDER BY uid/);
  assert.match(func,/hashtextextended\(v_a3_lock_owner::text,901426\)/);
  assert.match(fence,/CREATE TRIGGER a3_write_fence_post_comments BEFORE INSERT OR UPDATE OR DELETE/);
  assert.match(comments,/CREATE TRIGGER trg_process_post_comment_side_effects[\s\S]*?AFTER INSERT OR DELETE/);
  assert.match(comments,/PERFORM private\.adjust_pet_learning_tags/);
});
