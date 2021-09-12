/* Formatted on 08/09/2021 13:28:36 (QP5 v5.287) */
-- Columns of a table

SELECT (LISTAGG (column_name, ',') WITHIN GROUP (ORDER BY column_id)) cols
  FROM sys.all_tab_columns
 WHERE table_name = 'APPL_LOG' AND owner = UPPER ('DOXIS'); -- LOG_ID,LOG_DATE,LOG_LVL

-- Table with composite index

CREATE TABLE TBL_COMPOSITE_PK
(
   ID        NUMERIC (1),
   CODE      VARCHAR (2),
   STHELSE   VARCHAR (8),
   CONSTRAINT PK_D PRIMARY KEY (ID, CODE)
);

-- Primary Index von DOXIS.TBL_COMPOSITE_PK

SELECT column_name
  FROM all_cons_columns
 WHERE     owner = UPPER ('DOXIS')
       AND constraint_name =
              (SELECT constraint_name
                 FROM user_constraints
                WHERE     UPPER (table_name) = UPPER ('TBL_COMPOSITE_PK')
                      AND CONSTRAINT_TYPE = 'P'); -- ID | CODE


  -- SELECT (LISTAGG (constraint_name, ',') WITHIN GROUP (ORDER BY table_name)) pks
SELECT table_name, column_name
  FROM all_cons_columns
 WHERE constraint_name IN (SELECT constraint_name
                             FROM user_constraints
                            WHERE CONSTRAINT_TYPE = 'P' AND OWNER = 'DOXIS');

-- COUNT rows
-- If you want just a rough estimate, you can extrapolate from a sample:

/* Formatted on 09/09/2021 00:54:00 (QP5 v5.287) */
SELECT COUNT (*) * 100
  FROM aktenklasse SAMPLE (1);  -- 600

-- For greater speed (but lower accuracy) you can reduce the sample size:
SELECT COUNT (*) * 1000
  FROM aktenklasse SAMPLE (0.1); -- 1000

-- For even greater speed (but even worse accuracy) you can use block-wise sampling:
SELECT COUNT (*) * 100
  FROM aktenklasse SAMPLE BLOCK (1); -- 0

SELECT /*+ parallel */ COUNT (*) FROM aktenklasse;