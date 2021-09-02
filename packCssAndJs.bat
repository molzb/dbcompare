cd src/main/resources
copy NUL packed.css
copy NUL packed.js

copy /b js\jqLite.js    + js\db_compare.js   packed.js
copy /b css\tooltip.css + css\db_compare.css packed.css

cd ../../..
