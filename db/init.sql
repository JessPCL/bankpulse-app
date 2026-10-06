-- BANKPULSE - esquema y datos semilla (TEC-BP-03). Se ejecuta solo al crear el volumen bankpulse_pgdata.
CREATE TABLE clientes (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL,
  correo  VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE restaurantes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  direccion  VARCHAR(150) NOT NULL,
  lat        DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng        DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180)
);

CREATE TABLE franjas_reserva (
  id                  SERIAL PRIMARY KEY,
  restaurante_id      INTEGER NOT NULL REFERENCES restaurantes(id),
  fecha               DATE NOT NULL,
  hora                TIME NOT NULL,
  cupos_totales       INTEGER NOT NULL CHECK (cupos_totales > 0),
  cupos_disponibles   INTEGER NOT NULL CHECK (cupos_disponibles >= 0 AND cupos_disponibles <= cupos_totales),
  precio_por_persona  NUMERIC(8,2) NOT NULL CHECK (precio_por_persona > 0),
  UNIQUE (restaurante_id, fecha, hora)
);
CREATE INDEX idx_franjas_busqueda ON franjas_reserva (restaurante_id, fecha, hora);

CREATE TABLE reservas (
  id                   SERIAL PRIMARY KEY,
  codigo_confirmacion  VARCHAR(12) NOT NULL UNIQUE,
  cliente_id           INTEGER NOT NULL REFERENCES clientes(id),
  franja_id            INTEGER NOT NULL REFERENCES franjas_reserva(id),
  comensales           INTEGER NOT NULL CHECK (comensales BETWEEN 1 AND 20),
  monto                NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  estado               VARCHAR(15) NOT NULL CHECK (estado IN ('CONFIRMADA', 'CANCELADA')),
  clave_idempotencia   VARCHAR(100) NOT NULL UNIQUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pagos (
  id          SERIAL PRIMARY KEY,
  reserva_id  INTEGER REFERENCES reservas(id),
  cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
  monto       NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  token_pago  VARCHAR(60) NOT NULL,
  estado      VARCHAR(12) NOT NULL CHECK (estado IN ('AUTORIZADO', 'RECHAZADO')),
  referencia  VARCHAR(30),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Datos semilla (ficticios). Coordenadas de ejemplo en Quito.
INSERT INTO clientes (nombre, correo) VALUES
  ('Camila Torres', 'camila@example.com'),
  ('Marco Salazar', 'marco@example.com');

INSERT INTO restaurantes (nombre, direccion, lat, lng) VALUES
  ('Cocina del Valle',      'La Mariscal, Quito',      -0.2000, -78.4900),
  ('Sabores Andinos',       'La Floresta, Quito',      -0.2050, -78.4850),
  ('Terraza Pichincha',     'Gonzalez Suarez, Quito',  -0.1900, -78.4800),
  ('Fogon de la Carolina',  'La Carolina, Quito',      -0.1800, -78.4800),
  ('Bistro Cumbaya',        'Cumbaya, Quito',          -0.2000, -78.4400),
  ('Mar y Tierra Tumbaco',  'Tumbaco, Quito',          -0.2100, -78.4000);

-- Franjas de los proximos 120 dias para cada restaurante (fechas relativas a la creacion de la base).
INSERT INTO franjas_reserva (restaurante_id, fecha, hora, cupos_totales, cupos_disponibles, precio_por_persona)
SELECT r.id, CURRENT_DATE + d, h::time, 10, 10, 15.00 + (r.id * 2.50)
  FROM restaurantes r
 CROSS JOIN generate_series(1, 120) AS d
 CROSS JOIN (VALUES ('12:00'), ('13:30'), ('19:00'), ('20:30')) AS horas(h);
