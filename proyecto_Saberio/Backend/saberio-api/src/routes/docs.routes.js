const { Router } = require('express');
const especificacion = require('../../docs/openapi');
const router = Router();

router.get('/openapi.json', (req, res) => {
  res.json(especificacion);
});

router.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saberio API - Documentación</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>
window.onload = function () {
  SwaggerUIBundle({
    url: '/api/docs/openapi.json',
    dom_id: '#swagger-ui',
    validatorUrl: null,
    withCredentials: true,
    persistAuthorization: false,
    supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete']
  });
};
</script>
</body>
</html>`);
});

module.exports = router;
