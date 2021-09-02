var dbAndSql = 'Doxis2E;SELECT table_name, num_rows FROM user_tables ORDER BY table_name';
  fetch('select.json', {method : 'post', body : dbAndSql}).then(response => { response.json().then(js => console.log(js)) });

mvn install:install-file -DgroupId=com.oracle.jdbc -DartifactId=ojdbc8 -Dversion=12.2.0.1 -Dpackaging=jar -Dfile=C:/java/ojdbc8.jar -DgeneratePom=true