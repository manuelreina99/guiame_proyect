# guiame

Aplicación de gestión de grupos y guías turísticos

Frontend:
 AngularJS
 Bootstrap

Backend:
* Node.js
* Express
* PostgreSQL

Instalación y puesta en funcionamiento:
1. crear bbdd guiame en postgresql con /sql/guiame.sql, este script crea la bbdd e inserta algunos datos de prueba
2. inicializar variables de entorno en .env
* DATABASE_URL
* SECRET_KEY
* SECONDS_TO_EXPIRE_TOKEN
3. npm install
4. heroku local
5. iniciar sesión en la aplicación con usuario:demo, password:demo