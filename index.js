
const  { PORT } = require ("./const/config");
const {app} = require("./app");

app.listen(PORT);
console.log(`Server on port http://localhost:${PORT}`);