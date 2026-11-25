/*
 * Copia os dados da loja e o estoque do banco local (data/db.json) para data/seed.json,
 * que é o que vai para o GitHub e alimenta a vitrine. Não copia senha, segredo nem clientes.
 * Uso: npm run export-seed   (depois: commit + push para atualizar o site no ar)
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'data');
const db = JSON.parse(fs.readFileSync(path.join(DATA, 'db.json'), 'utf8'));
fs.writeFileSync(path.join(DATA, 'seed.json'), JSON.stringify({ settings: db.settings, vehicles: db.vehicles }, null, 2) + '\n');
console.log(`seed.json atualizado: ${db.vehicles.length} veículos.`);
