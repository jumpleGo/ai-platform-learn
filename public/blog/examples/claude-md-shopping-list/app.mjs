import { addItem } from './list.mjs';

const groceries = addItem(['хлеб'], ' молоко ');
console.log(groceries.join('\n'));
