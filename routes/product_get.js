
const pool = require('../db/db');
const router = require('express').Router();
const { generateBottomTitles } = require('../functions/help');
const fs = require('fs');
const path = require('path');


router.get('/productos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Asegúrate de convertir a entero
        const limit = 25;
        const offset = (page - 1) * limit;

            const { rows } = await pool.query(`
        SELECT p.id, p.nombre, p.lugar, p.imagen AS photo, p.product_url AS urlproducto, h.precio, h.fecha
        FROM productos p
        JOIN (
            SELECT producto_id, precio, fecha
            FROM historial_precios
            WHERE (producto_id, fecha) IN (
                SELECT producto_id, MAX(fecha)
                FROM historial_precios
                GROUP BY producto_id
            )
        ) h ON p.id = h.producto_id
        ORDER BY RANDOM()
        LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Opcional: calcular el total de páginas
    const totalRes = await pool.query(`
        SELECT COUNT(*) FROM productos;
    `);
    const totalRows = totalRes.rows[0].count;
    const totalPages = Math.ceil(totalRows / limit);

    res.json({
        data: rows,
        totalPages: totalPages,
        currentPage: page,
        limit: limit
    });
} catch (error) {
    console.error(error);
    res.status(500).send('Error al obtener los productos');
}
});

router.get('/producto/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        // Consulta para obtener los detalles del producto
        const productQuery = `
            SELECT p.id, p.nombre, p.lugar, p.imagen AS photo, p.product_url AS urlproducto, h.precio, h.fecha
            FROM productos p
            JOIN (
                SELECT producto_id, precio, fecha
                FROM historial_precios
                WHERE (producto_id, fecha) IN (
                    SELECT producto_id, MAX(fecha)
                    FROM historial_precios
                    GROUP BY producto_id
                )
            ) h ON p.id = h.producto_id
            WHERE p.id = $1
        `;
        const productRes = await pool.query(productQuery, [productId]);

        // Verifica si el producto existe
        if (productRes.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const product = productRes.rows[0];

        res.json({
            id: product.id,
            nombre: product.nombre,
            lugar: product.lugar,
            photo: product.photo,
            urlproducto: product.urlproducto,
            precio: product.precio,
            fecha: product.fecha
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los detalles del producto');
    }
});

router.get('/productos/categoria/:categoria', async (req, res) => {
    const categoria = req.params.categoria;

    try {
        const { rows } = await pool.query(`
            SELECT p.id, p.nombre, p.lugar, p.imagen AS photo, p.product_url AS urlproducto, h.precio, h.fecha
            FROM productos p
            JOIN (
                SELECT producto_id, precio, fecha
                FROM historial_precios
                WHERE (producto_id, fecha) IN (
                    SELECT producto_id, MAX(fecha)
                    FROM historial_precios
                    GROUP BY producto_id
                )
            ) h ON p.id = h.producto_id
            WHERE p.categoria = $1
            ORDER BY RANDOM()
        `, [categoria]);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener los productos por categoría:', error);
        res.status(500).send('Error al obtener los productos por categoría');
    }
});
router.get('/productos/mayor-baja', async (req, res) => {
    try {
        const { rows } = await pool.query(`
        SELECT p.id, p.nombre, p.imagen AS photo, p.product_url AS urlproducto, h2.precio AS precio_actual, (h2.precio - h1.precio) AS diferencia
            FROM productos p
            JOIN historial_precios h1 ON p.id = h1.producto_id
            JOIN historial_precios h2 ON p.id = h2.producto_id
            WHERE h1.fecha < h2.fecha
            ORDER BY RANDOM()
            LIMIT 20
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener los productos con mayor baja de precio:', error);
        res.status(500).send('Error al obtener los productos con mayor baja de precio');
    }
});
router.get('/productos/mayor-subida', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.id, p.nombre, (h2.precio - h1.precio) AS diferencia
            FROM productos p
            JOIN historial_precios h1 ON p.id = h1.producto_id
            JOIN historial_precios h2 ON p.id = h2.producto_id
            WHERE h1.fecha < h2.fecha
            ORDER BY diferencia DESC
            LIMIT 3
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener los productos con mayor subida de precio:', error);
        res.status(500).send('Error al obtener los productos con mayor subida de precio');
    }
});

router.get('/productos/:id/historial-precios', async (req, res) => {
    const productId = req.params.id; // O usa req.query.id si prefieres pasar el id como parámetro de consulta

    try {
        const { rows } = await pool.query(`
            SELECT precio, fecha
            FROM historial_precios
            WHERE producto_id = $1
            ORDER BY fecha ASC
        `, [productId]);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener el historial de precios:', error);
        res.status(500).send('Error al obtener el historial de precios');
    }
});
router.get('/productos/:id/historico-precios', async (req, res) => {
    const productId = req.params.id;

    try {
        const { rows } = await pool.query(`
            SELECT precio, fecha
            FROM historial_precios
            WHERE producto_id = $1
            ORDER BY fecha ASC
        `, [productId]);

        const data = {
            spots: rows.map((row, index) => ({
                x: index, // O alguna otra lógica para determinar el eje x, como el mes de la fecha
                y: parseFloat(row.precio)
            })),
            leftTitle: {
                0: '0',
                20: '2K',
                40: '4K',
                60: '6K',
                80: '8K',
                100: '10K'
            },
            bottomTitle: generateBottomTitles(rows)
        };

        res.json(data);
    } catch (error) {
        console.error('Error al obtener el historial de precios:', error);
        res.status(500).send('Error al obtener el historial de precios');
    }
});



router.get('/productos/similares/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        // Obtén la categoría y el último precio del producto especificado
        const productRes = await pool.query(`
            SELECT p.categoria, hp.precio
            FROM productos p
            JOIN historial_precios hp ON p.id = hp.producto_id
            WHERE p.id = $1
            ORDER BY hp.fecha DESC
            LIMIT 1
        `, [productId]);

        if (productRes.rows.length === 0) {
            return res.status(404).send('Producto no encontrado');
        }

        const { categoria, precio } = productRes.rows[0];

        // Define un rango de precios similar, por ejemplo, ±10%
        const precioMin = precio * 0.8;
        const precioMax = precio * 1.2;

        // Busca productos similares en la misma categoría y con un precio similar
        const { rows } = await pool.query(`
            SELECT p.id, p.nombre, p.imagen AS photo, p.lugar, p.categoria, p.product_url AS  urlproducto, hp.precio, MAX(hp.fecha) AS fecha
            FROM productos p
            JOIN historial_precios hp ON p.id = hp.producto_id
            WHERE p.categoria = $1
            AND hp.precio BETWEEN $2 AND $3
            AND p.id <> $4
            GROUP BY p.id, hp.precio
            ORDER BY RANDOM()
            LIMIT 10
        `, [categoria, precioMin, precioMax, productId]);

        res.json(rows);
    } catch (error) {
        console.error('Error al buscar productos similares:', error);
        res.status(500).send('Error interno del servidor');
    }
});


router.get('/productos/busqueda', async (req, res) => {
    // Obtener el término de búsqueda del query string
    const terminoBusqueda = req.query.q;

    if (!terminoBusqueda) {
        return res.json({ error: "Debe proporcionar un término de búsqueda" });
    }

    try {
        // Realizar la consulta a la base de datos
        // Utiliza ILIKE para búsqueda insensible a mayúsculas y '%term%' para coincidencias parciales
        const { rows } = await pool.query(`
            SELECT p.id, p.nombre, p.lugar, p.imagen AS photo, p.product_url AS urlproducto, h.precio, h.fecha
            FROM productos p
            JOIN (
                SELECT producto_id, precio, fecha
                FROM historial_precios
                WHERE (producto_id, fecha) IN (
                    SELECT producto_id, MAX(fecha)
                    FROM historial_precios
                    GROUP BY producto_id
                )
            ) h ON p.id = h.producto_id
            WHERE p.nombre ILIKE $1
            LIMIT 100;
        `, [`%${terminoBusqueda}%`]); // '%' permite coincidencias parciales antes y después del término

        res.json(rows);
    } catch (error) {
        console.error('Error en la búsqueda predictiva:', error);
        res.status(500).send('Error interno del servidor');
    }
});


router.get('/productos/grafica', (req, res) => {
    const filePath = path.join(__dirname, '..', 'const', 'resultado.json'); 
    console.log(`Intentando leer el archivo JSON desde: ${filePath}`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo JSON:', err);
            return res.status(500).send('Error interno del servidor al leer el archivo JSON');
        }

        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (parseError) {
            console.error('Error al parsear el archivo JSON:', parseError);
            console.error('Contenido del archivo JSON:', data);
            res.status(500).send('Error interno del servidor al parsear el archivo JSON');
        }
    });
});


module.exports = {router};
