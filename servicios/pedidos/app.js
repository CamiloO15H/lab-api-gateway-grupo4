// Servicio de Pedidos — Laboratorio API Gateway (Grupo 4)
// Crea y consulta pedidos. Para crear un pedido consulta al servicio de Productos.
const express = require('express');

const app = express();
app.use(express.json());

const PUERTO = process.env.PUERTO || 3002;
const URL_PRODUCTOS = process.env.URL_PRODUCTOS || 'http://localhost:3001';

const pedidos = [];   // almacenamiento en memoria
let siguienteId = 1;

app.use((req, _res, next) => {
  console.log(`[pedidos] ${new Date().toISOString()} ${req.method} ${req.originalUrl} consumidor=${req.get('x-consumer-username') || '-'}`);
  next();
});

app.get('/health', (_req, res) => res.json({ servicio: 'pedidos', estado: 'UP' }));

app.get('/', (_req, res) => res.json(pedidos));

app.get('/:id', (req, res) => {
  const pedido = pedidos.find(p => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'PEDIDO_NO_ENCONTRADO', id: req.params.id });
  res.json(pedido);
});

app.post('/', async (req, res) => {
  const { productoId, cantidad } = req.body || {};

  // 1. Validación de datos de entrada (error funcional → 400)
  if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      error: 'DATOS_INVALIDOS',
      detalle: 'productoId y cantidad deben ser enteros y cantidad > 0',
    });
  }

  // 2. Integración con Productos (servicio a servicio)
  let producto;
  try {
    const r = await fetch(`${URL_PRODUCTOS}/${productoId}`, { signal: AbortSignal.timeout(2000) });
    if (r.status === 404) {
      return res.status(422).json({ error: 'PRODUCTO_NO_EXISTE', productoId });
    }
    if (!r.ok) throw new Error(`Productos respondió ${r.status}`);
    producto = await r.json();
  } catch (e) {
    console.error(`[pedidos] Falla integrando con productos: ${e.message}`);
    return res.status(503).json({ error: 'PRODUCTOS_NO_DISPONIBLE' });
  }

  // 3. Regla de negocio: stock suficiente
  if (producto.stock < cantidad) {
    return res.status(409).json({ error: 'STOCK_INSUFICIENTE', disponible: producto.stock });
  }

  const pedido = {
    id: siguienteId++,
    productoId,
    cantidad,
    total: producto.precio * cantidad,
    estado: 'CREADO',
  };
  pedidos.push(pedido);
  res.status(201).json(pedido);
});

app.listen(PUERTO, () => console.log(`[pedidos] escuchando en puerto ${PUERTO}`));
