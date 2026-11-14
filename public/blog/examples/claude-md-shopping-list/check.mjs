import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addItem } from './list.mjs';

test('добавляет товар в конец списка и убирает пробелы по краям', () => {
  assert.deepEqual(addItem(['хлеб'], ' молоко '), ['хлеб', 'молоко']);
});

test('пропускает пустое название', () => {
  assert.deepEqual(addItem(['хлеб'], '   '), ['хлеб']);
});

test('сохраняет прежний список без изменений', () => {
  const groceries = ['хлеб'];
  const updated = addItem(groceries, 'молоко');
  assert.deepEqual(groceries, ['хлеб']);
  assert.notStrictEqual(updated, groceries);
});
