// Servicio de Productos — Laboratorio API Gateway (Grupo 4)
// Expone el catálogo de productos. Solo lo consume el gateway y el servicio de Pedidos.
const express = require('express');

const app = express();
app.use(express.json());

const PUERTO = process.env.PUERTO || 3001;

// Datos de prueba (ficticios, en memoria)
const productos = [
  { id: 1, nombre: 'Teclado mecánico', precio: 180000, stock: 10 },
  { id: 2, nombre: 'Mouse inalámbrico', precio: 75000, stock: 25 },
  { id: 3, nombre: 'Monitor 24 pulgadas', precio: 650000, stock: 0 },
];

// Log de cada solicitud: sirve como evidencia de que el gateway SÍ (o NO) llegó al servicio
app.use((req, _res, next) => {
  console.log(`[productos] ${new Date().toISOString()} ${req.method} ${req.originalUrl} consumidor=${req.get('x-consumer-username') || '-'}`);
  next();
});

// Inyección de fallas controlada: ?demoraMs=5000 retrasa la respuesta.
// Se usa SOLO para probar el timeout del gateway (caso CP-09).
app.use((req, _res, next) => {
  const demora = Number(req.query.demoraMs || 0);
  if (demora > 0) return setTimeout(next, Math.min(demora, 15000));
  next();
});

app.get('/health', (_req, res) => res.json({ servicio: 'productos', estado: 'UP' }));

app.get('/', (_req, res) => res.json(productos));

app.get('/:id', (req, res) => {
  const producto = productos.find(p => p.id === Number(req.params.id));
  if (!producto) return res.status(404).json({ error: 'PRODUCTO_NO_ENCONTRADO', id: req.params.id });
  res.json(producto);
});

app.listen(PUERTO, () => console.log(`[productos] escuchando en puerto ${PUERTO}`));
