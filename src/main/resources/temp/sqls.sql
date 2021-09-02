SELECT table_name,
       TO_NUMBER (
          EXTRACTVALUE (
             xmltype (
                DBMS_XMLGEN.getxml (
                      'select count(*) cnt from ' || owner || '.' || table_name || ' SAMPLE(1)')),
             '/ROWSET/ROW/CNT'))
          AS COUNT
  FROM all_tables
 WHERE owner = 'DOXIS4E';
 SELECT table_name,
       TO_NUMBER (
          EXTRACTVALUE (
             xmltype (
                DBMS_XMLGEN.getxml (
                      'select count(*) cnt from ' || table_name || ' SAMPLE(1)')),
             '/ROWSET/ROW/CNT'))
          AS COUNT
  FROM user_tables;