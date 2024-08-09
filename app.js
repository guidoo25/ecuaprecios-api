const express = require('express');
const cors = require('cors');
const {router} = require('./routes/product_get');
//const {routes} = require('./routes/sheet');

const app = express();
app.use(cors()); // Aplica CORS a todas las rutas
app.use(express.json());
app.use("/api", router);
app.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
  });
  
  app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(error.status || 500).json({
      error: {
        message: error.message,
      },
    });
  });
module.exports = {app};