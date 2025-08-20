// index.js
const util = require('util');
util.isArray = Array.isArray;

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const PORT = process.env.PORT || 3000;

const { isAuthenticated, allowRoles } = require('./middlewares/authMiddleware');

// Routers
const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const orderRoutes       = require('./routes/orderRoutes');
const productionRoutes  = require('./routes/productionRoutes');
const dispatchRoutes    = require('./routes/dispatchRoutes');
const reportRoutes      = require('./routes/reportRoutes');

// Controladores
const dashboardController = require('./controllers/dashboardController');

// View engine y estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sesión y flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Exponer vars a vistas
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.user    = req.session.user || null;
  next();
});

// ---- Rutas públicas (primero) ----
app.use('/login', authRoutes);

// Raíz: si hay sesión -> dashboard; si no -> login
app.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  return res.redirect('/login');
});

// ---- Rutas protegidas ----
app.get('/dashboard', isAuthenticated, (req, res) =>
  dashboardController.showDashboard(req, res)
);

app.use('/dispatches', isAuthenticated, allowRoles('DISPATCH','ADMIN'),     dispatchRoutes);
app.use('/production', isAuthenticated, allowRoles('TRAZABILIDAD','ADMIN'), productionRoutes);
app.use('/orders',     isAuthenticated, allowRoles('TRAZABILIDAD','ADMIN'), orderRoutes);

// Montaje correcto: el router de reportes se monta en '/reports'
app.use('/reports',    isAuthenticated, allowRoles('TRAZABILIDAD','ADMIN'), reportRoutes);

app.use('/users',      isAuthenticated, allowRoles('ADMIN'),                userRoutes);

// ---- 404 real ----
app.use((req, res) => {
  res.status(404).render('errors/404', {
    pageTitle: 'No encontrado',
    user: req.session.user || null
  });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
