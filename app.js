const express = require('express');
const cors = require('cors');
const {router} = require('./routes/product_get');

const app = express();
app.use(cors()); // Aplica CORS a todas las rutas
app.use(express.json());
app.use("/api", router);

module.exports = {app};