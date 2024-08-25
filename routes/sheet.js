const {authenticateGoogleSheets} = require('../db/sheet.js');
const express = require('express');



  async function getProductsByCategory(category) {
    await authenticateGoogleSheets();
    const sheet = doc.sheetsByIndex[10]; 
    const rows = await sheet.getRows();
  
    return rows.filter(row => row.categoria === category);
  }

  async function procesarTodasLasHojas(doc) {
    let allData = [];
    const totalHojas = doc.sheetsByIndex.length;
  
    for (let i = 0; i < totalHojas; i++) {
      const sheet = doc.sheetsByIndex[i];
      const rows = await sheet.getRows();
  
      const sheetData = rows.map(row => ({
        nombre: row._rawData[0],
        precio: row._rawData[1],
        imagen: row._rawData[2],
        lugar: row._rawData[3],
        categoria: row._rawData[4],
        productUrl: row._rawData[5],
        fecha: row._rawData[6],
      }));
  
      allData = allData.concat(sheetData);
    }
  
    return allData;
  }
  
  const routes = express();  
  routes.get('/productos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const categoriaFiltro = req.query.categoria || null;
    
        const doc = await authenticateGoogleSheets();
        const allData = await procesarTodasLasHojas(doc);
    
        let filteredData = allData;
        if (categoriaFiltro) {
          filteredData = allData.filter(item => item.categoria === categoriaFiltro);
        }
    
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);
    
        const pageInfo = {
          currentPage: page,
          limit,
          totalPages: Math.ceil(filteredData.length / limit),
          totalItems: filteredData.length,
          showingItems: paginatedData.length,
          hasNextPage: endIndex < filteredData.length,
          hasPreviousPage: startIndex > 0
        };
    
        res.json({ data: paginatedData, pageInfo });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  
  
  routes.get('/productos/categoria/:categoria', async (req, res) => {
    const categoria = req.params.categoria;
  
    try {
        const doc = await authenticateGoogleSheets();

        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        console.log(rows);
  
      const data = rows.filter(row => row.categoria === categoria).map(row => ({
        id: row._rowNumber,
        nombre: row.nombre,
        lugar: row.lugar,
        photo: row.imagen,
        urlproducto: row.productUrl,
        precio: row.precio,
        fecha: row.fecha,
      }));
  
      res.json(data);
    } catch (error) {
      console.error('Error al obtener los productos por categoría:', error);
      res.status(500).send('Error al obtener los productos por categoría');
    }
  });
  
  // Endpoint para obtener productos con mayor baja de precio
  routes.get('/productos/mayor-baja', async (req, res) => {
    try {
      const rows = await getSheetRows(0); // Asumimos que los productos están en la primera hoja
  
      // Lógica para calcular la mayor baja de precio
      const data = rows.map(row => ({
        id: row._rowNumber,
        nombre: row.nombre,
        photo: row.imagen,
        urlproducto: row.productUrl,
        precio_actual: row.precio,
        diferencia: parseFloat(row.precio) - parseFloat(row.precio_anterior)
      })).sort((a, b) => a.diferencia - b.diferencia).slice(0, 20);
  
      res.json(data);
    } catch (error) {
      console.error('Error al obtener los productos con mayor baja de precio:', error);
      res.status(500).send('Error al obtener los productos con mayor baja de precio');
    }
  });
  
  // Endpoint para obtener productos con mayor subida de precio
  routes.get('/productos/mayor-subida', async (req, res) => {
    try {
      const rows = await getSheetRows(0); // Asumimos que los productos están en la primera hoja
  
      // Lógica para calcular la mayor subida de precio
      const data = rows.map(row => ({
        id: row._rowNumber,
        nombre: row.nombre,
        diferencia: parseFloat(row.precio) - parseFloat(row.precio_anterior)
      })).sort((a, b) => b.diferencia - a.diferencia).slice(0, 3);
  
      res.json(data);
    } catch (error) {
      console.error('Error al obtener los productos con mayor subida de precio:', error);
      res.status(500).send('Error al obtener los productos con mayor subida de precio');
    }
  });
  
  // Endpoint para obtener el historial de precios de un producto
  routes.get('/productos/:id/historial-precios', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
  
    try {
      const rows = await getSheetRows(0); // Asumimos que los productos están en la primera hoja
  
      const productRows = rows.filter(row => row._rowNumber === productId);
  
      const data = productRows.map(row => ({
        precio: row.precio,
        fecha: row.fecha
      })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
      res.json(data);
    } catch (error) {
      console.error('Error al obtener el historial de precios:', error);
      res.status(500).send('Error al obtener el historial de precios');
    }
  });
  
  // Endpoint para obtener productos similares
  routes.get('/productos/similares/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
  
    try {
      const rows = await getSheetRows(0); // Asumimos que los productos están en la primera hoja
  
      const productRow = rows.find(row => row._rowNumber === productId);
      if (!productRow) {
        return res.status(404).send('Producto no encontrado');
      }
  
      const categoria = productRow.categoria;
      const precio = parseFloat(productRow.precio);
      const precioMin = precio * 0.8;
      const precioMax = precio * 1.2;
  
      const similares = rows.filter(row => row.categoria === categoria && parseFloat(row.precio) >= precioMin && parseFloat(row.precio) <= precioMax && row._rowNumber !== productId).map(row => ({
        id: row._rowNumber,
        nombre: row.nombre,
        photo: row.imagen,
        lugar: row.lugar,
        categoria: row.categoria,
        urlproducto: row.productUrl,
        precio: row.precio,
        fecha: row.fecha
      })).slice(0, 10);
  
      res.json(similares);
    } catch (error) {
      console.error('Error al buscar productos similares:', error);
      res.status(500).send('Error interno del servidor');
    }
  });
  
  // Endpoint para búsqueda predictiva de productos
  routes.get('/productos/busqueda', async (req, res) => {
    const terminoBusqueda = req.query.q;
  
    if (!terminoBusqueda) {
      return res.json({ error: "Debe proporcionar un término de búsqueda" });
    }
  
    try {
      const rows = await getSheetRows(0); // Asumimos que los productos están en la primera hoja
  
      const data = rows.filter(row => row.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase())).map(row => ({
        id: row._rowNumber,
        nombre: row.nombre,
        lugar: row.lugar,
        photo: row.imagen,
        urlproducto: row.productUrl,
        precio: row.precio,
        fecha: row.fecha
      })).slice(0, 100);
  
      res.json(data);
    } catch (error) {
      console.error('Error en la búsqueda predictiva:', error);
      res.status(500).send('Error interno del servidor');
    }
  });

  module.exports = {routes};
   