/**
 * db.js — Lightweight JSON file-based store (no MongoDB needed)
 * All data persists in ./data/*.json files.
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function dbFile(name) { return path.join(DATA_DIR, `${name}.json`); }

function read(name) {
  const file = dbFile(name);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function write(name, data) {
  fs.writeFileSync(dbFile(name), JSON.stringify(data, null, 2), 'utf8');
}

function findAll(name) { return read(name); }

function findById(name, id) {
  return read(name).find(r => String(r.id) === String(id)) || null;
}

function findOne(name, predicate) {
  return read(name).find(predicate) || null;
}

function findMany(name, predicate) {
  return read(name).filter(predicate);
}

function insert(name, record) {
  const rows = read(name);
  // Auto-increment id
  record.id = rows.length > 0 ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
  record.createdAt = record.createdAt || new Date().toISOString();
  rows.push(record);
  write(name, rows);
  return record;
}

function updateById(name, id, updates) {
  const rows = read(name);
  const idx  = rows.findIndex(r => String(r.id) === String(id));
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...updates, updatedAt: new Date().toISOString() };
  write(name, rows);
  return rows[idx];
}

function removeById(name, id) {
  let rows = read(name);
  const existed = rows.some(r => String(r.id) === String(id));
  rows = rows.filter(r => String(r.id) !== String(id));
  write(name, rows);
  return existed;
}

module.exports = { findAll, findById, findOne, findMany, insert, updateById, removeById };
