/* db_compare.js */
/* jshint esversion: 6 */
/* globals $, Err, window, document, fetch, localStorage, console, $all: false */
'use strict';
var tables = {};

var rows = {
    areDifferent: false,
    fields: [],
    fieldId: '',

    all: {},
    selected: {},
    different: {},
    identical: {},
    withSameId: {},
    onlyIn: {}
};

// TODO
// rows.all["DOXIS"] = 
// { cols: {LOG_DATE: '2019-12-21 18:31:16', LOG_LVL: 'INFO    ', LOG_MSG: 'Test', LOG_ID: '1'}, hasEqual: 0, pk: ["x","y"], hasDiff : 2, fields : ["LOG_DATE", "LOG_LVL"]}

function jsonIsEqual(json1, json2) {
    if (json1 === json2)
        return true;
    var isEqual = true;
    for (var i = 0; i < rows.fields.length; i++) {
        if (json1[rows.fields[i]] !== json2[rows.fields[i]]) {
            isEqual = false;
            break;
        }
    }
    return isEqual;
}

function jsonClone(json) {
    return JSON.parse(JSON.stringify(json));
}

/**
 * Compares the resultset selected databases<br>
 * If the row in one databases is equal to a row in the other db, it creates a
 * reference rows1[x].hasEqual=indexInRows2 and rows2[x].hasEqual=indexInRows1  
 * @param {*} rows1 resultset of database 1 
 * @param {*} rows2 resultset of database 2
 * @param {*} checkedDbs the selected databases
 */
function compareTables(rows1, rows2, checkedDbs) {
    rows.areDifferent = JSON.stringify(rows1) !== JSON.stringify(rows2);
    if (rows.areDifferent) {
        for (var i1 = 0; i1 < rows1.length; i1++) {
            for (var i2 = 0; i2 < rows2.length; i2++) {
                if (!rows1[i1].hasEqual && !rows2[i2].hasEqual && jsonIsEqual(rows1[i1], rows2[i2])) {
                    rows1[i1].hasEqual = i2;
                    rows2[i2].hasEqual = i1;
                    break;
                }
            }
        }
    } else {
        var r1Idx = 0,
            r2Idx = 0;
        rows1.forEach(r => r.hasEqual = r1Idx++);
        rows2.forEach(r => r.hasEqual = r2Idx++);
    }
    var db1 = checkedDbs[0],
        db2 = checkedDbs[1];
    rows.different[db1] = jsonClone(rows.all[db1].filter(r => r.hasEqual == undefined));
    rows.different[db2] = jsonClone(rows.all[db2].filter(r => r.hasEqual == undefined));
    rows.identical[db1] = jsonClone(rows.all[db1].filter(r => r.hasEqual));
    rows.identical[db2] = jsonClone(rows.all[db2].filter(r => r.hasEqual));
    compareRowsWithSameIds(rows.different[db1], rows.different[db2]);

    rows.withSameId[db1] = jsonClone(rows.different[db1].filter(r => r.hasDiff));
    rows.withSameId[db2] = jsonClone(rows.different[db2].filter(r => r.hasDiff));
    rows.onlyIn[db1] = jsonClone(rows.different[db1].filter(r => r.hasDiff == undefined));
    rows.onlyIn[db2] = jsonClone(rows.different[db2].filter(r => r.hasDiff == undefined));

    var diff1Len = rows.different[db1].length,
        diff2Len = rows.different[db2].length;
    var result = `Result: Equal rows: ${rows.identical[db1].length}, different rows: ${diff1Len}/${diff2Len}`;
    $('#comparisonResult').innerHTML = rows.areDifferent ? result : 'All rows are identical';
}

function compareRowsWithSameIds(rows1, rows2) {
    // TODO Read Resultset Metadata
    var fieldsWithId = rows.fields.filter(f => f.toLowerCase().startsWith('id') || f.toLowerCase().endsWith('id'));
    if (fieldsWithId.length === 0) {
        return;
    }
    rows.fieldId = fieldsWithId[0].toString();
    for (var i1 = 0; i1 < rows1.length; i1++) {
        for (var i2 = 0; i2 < rows2.length; i2++) {
            if (rows1[i1][rows.fieldId] === rows2[i2][rows.fieldId]) {
                rows1[i1].hasDiff = i2;
                rows2[i2].hasDiff = i1;
                break;
            }
        }
    }
}

function showResultTable(db, theseRows) {
    var tblForDB = $("#sqlResult #tbl" + db);
    var count = theseRows[db].length;
    tblForDB.innerHTML = createTable(theseRows[db], db, false);
    tblForDB.nextElementSibling.innerHTML = `Showing ${count} results.`;
    addMouseEnterEventsInAllRows($(`#divTableContents #tbl${db}`));
}

function showInBothButDifferent() {
    getCheckedDbs().forEach(db => showResultTable(db, rows.different));
}

function showAllRows() {
    getCheckedDbs().forEach(db => showResultTable(db, rows.all));
}

function showOnlyInSource() {
    var db = getCheckedDbs()[0];
    showResultTable(db, rows.onlyIn);
}

function showOnlyInTarget() {
    var db = getCheckedDbs()[1];
    showResultTable(db, rows.onlyIn);
}

function showIdentical() {
    getCheckedDbs().forEach(db => showResultTable(db, rows.identical));
}

function keyupSql(e) {
    if (e.keyCode === 13) {
        execSql($('#txtSql').innerHTML);
    }
    return false;
}

function getDbNames(callback) {
    return new Promise((resolve, reject) => {
        fetch('conns.json').then(Err.handle).then(response => {
            response.json().then(json => {
                resolve(json.dbNames);
            });
        }).catch(Err.handleFetch);
    });
}

function renderDbCheckboxes(dbNames) {
    var chksLeft = '',
        chksRight = '';
    dbNames.forEach(j => {
        var lbl = `<span class="tooltip">${j}  | </span>`;
        chksLeft += `<input type="radio" name="dbsLeft" onchange="readTablesForOverview(getCheckedDbs())" value="${j}">${lbl}`;
        chksRight += `<input type="radio" name="dbsRight" onchange="readTablesForOverview(getCheckedDbs())" value="${j}">${lbl}`;
    });
    $('#chkDbsOnTheLeft').innerHTML += chksLeft;
    $('#chkDbsOnTheRight').innerHTML += chksRight;

    // retrieve checked DBs from localStorage
    var checkedDbs = [];
    if (localStorage.getItem("dbc_checkedDbs") != null) {
        checkedDbs = localStorage.getItem("dbc_checkedDbs").split(",");
        $all('#chkDbsOnTheLeft input').forEach(c => {
            if (checkedDbs[0].includes(c.value)) c.checked = true;
        });
        $all('#chkDbsOnTheRight input').forEach(c => {
            if (checkedDbs[1] === c.value) c.checked = true;
        });
    }
    return new Promise((resolve, reject) => resolve(checkedDbs));
}

function getCheckedDbs() {
    var checkedDbs = [];
    $all("#chkDbsOnTheLeft input").forEach(c => { if (c.checked) checkedDbs.push(c.value); });
    $all("#chkDbsOnTheRight input").forEach(c => { if (c.checked) checkedDbs.push(c.value); });
    return checkedDbs;
}

// Show tables with 0 rows in DB overview?
function toggleEmptyTables(checked) {
    readTablesForOverview(getCheckedDbs());
}

// Ping all databases in db.properties and disable checkboxes if necessary
function pingDbs() {
    fetch('pingDBs.json').then(Err.handle).then(response => {
        response.json().then(js => {
            var dbAvailable = js;
            var i = 0;
            $all('#chkDbsOnTheLeft input').forEach(c => addTooltip(dbAvailable, c, i++));
            i = 0;
            $all('#chkDbsOnTheRight input').forEach(c => addTooltip(dbAvailable, c, i++));
        });
    }).catch(Err.handleFetch);
}

function addTooltip(dbAvailable, elem, i) {
    var available = dbAvailable[i];
    if (!available) {
        elem.nextElementSibling.innerHTML += '<span class="tooltiptext">DB not available</span>';
        elem.disabled = true;
    }
}

function readTablesForOverview(checkedDbs) {
    if (checkedDbs.length > 0) {
        var showEmptyTables = $('#chkToggleEmptyTables').checked;
        readTablesFromCheckedDbs(checkedDbs, showEmptyTables || false);
        localStorage.setItem("dbc_checkedDbs", checkedDbs.toString().replace(', ', ',')); // -> "db1","db2"
    } else {
        $('#divTableComparison').empty();
        $('#txtErrorDb').innerHTML = "Please select a database!";
    }
}

function readTablesFromCheckedDbs(dbs, showEmptyTables) {
    if (dbs.length === 0)
        return;

    // first we do some cleanup for previously rendered tables
    removeMouseEventsForTds();
    $('#divTableComparison').empty();
    $('#txtErrorDb').empty();

    var sql = "SELECT table_name AS tables, num_rows FROM sys.all_tables WHERE owner = '%o' %s ORDER BY table_name";
    sql = sql.replace('%s', showEmptyTables ? "" : "AND num_rows > 0");

    // do a SELECT for the tables in the database
    dbs.forEach(dbName => {
        var sqlDb = sql.replace('%o', dbName);
        fetch('select.json', { method: 'post', body: dbName + ';' + sqlDb }).then(Err.handle).then(
            response => {
                response.json().then(rows => {
                    tables[dbName] = { rendered: {}, pks: {} };
                    tables[dbName].rendered = rows;
                    readPrimaryKeysOfTables(dbName, tables[dbName]);

                    var h3 = `<h3>${dbName}</h3>`;
                    var tbl = createTable(rows, dbName, true); // + "_Overview");
                    var wrapperForH3AndTbl = `<div class="tblWrapper">${h3}${tbl}</div>`;

                    $('#divTableComparison').innerHTML += wrapperForH3AndTbl;

                    // Show several DB schemas side by side
                    if (dbs.length > 1 && dbName === dbs[dbs.length - 1]) {
                        alignTablesHorizontally('#divTableComparison .tblWrapper', dbs.length);
                        grayOutTablesWithZeroRows();
                        setTimeout(() => addMouseEventsForTds(), 100); // sauberer?
                    }
                });
            }
        ).catch(Err.handleFetch);
    });
}

function readPrimaryKeysOfTables(dbName, tablesToEnrich) {
    var sqlDb = `SELECT table_name, column_name FROM all_cons_columns WHERE constraint_name IN
        (SELECT constraint_name FROM user_constraints WHERE CONSTRAINT_TYPE = 'P' AND OWNER = '${dbName}')`;

    $('#txtErrorDb').empty();
    fetch('select.json', { method: 'post', body: dbName + ';' + sqlDb }).then(Err.handle).then(response => {
        response.json().then(pks => {
            tablesToEnrich.rendered.forEach(t => {
                var pksForTable = pks.filter(pk => pk.TABLE_NAME === t.TABLES);
                t.pks = pksForTable;
            });
        });
    }).catch(Err.handleFetch);
}

// split tables horizontally, e.g. tbl1 33%| tbl2 33%| tbl3 33%
function alignTablesHorizontally(div, numberOfTables) {
    $all(div).forEach(t => {
        t.style.width = (98 / numberOfTables) + '%';
    });
}

function grayOutTablesWithZeroRows() {
    $all('#divTableComparison .tblSql td').forEach(cell => {
        if (cell.dataset.cnt === "0")
            cell.addClass('gray');
    });
}

function getAllTableCellsInOverview() {
    return $all('#divTableComparison .tblSql td');
}

function addMouseEventsForTds() {
    var allTds = getAllTableCellsInOverview();
    console.log("add events: " + allTds.length);
    allTds.forEach(td => {
        td.addEventListener('mouseenter', tdMouseEnterInOverview);
        td.addEventListener('mouseleave', tdMouseLeaveInOverview);
        td.addEventListener('click', showColumnsOfTable);
    });
}

function removeMouseEventsForTds() {
    var allTds = getAllTableCellsInOverview();
    console.log("remove events: " + allTds.length);
    allTds.forEach(td => {
        td.removeEventListener('mouseenter', tdMouseEnterInOverview);
        td.removeEventListener('mouseleave', tdMouseLeaveInOverview);
        td.removeEventListener('click', showColumnsOfTable);
    });
}

var lastClickedTdInOverview = null;

function showColumnsOfTable(e) {
    var td = e.target;
    if (td.tagName === 'INPUT')
        return;
    if (td.className.includes('gray'))
        return;
    if (td.dataset.columnsloaded === 'true') {
        td.find('.tableSelected').removeClass('hidden'); // wrapping div for checkboxes
        hideLastSelected(td);
        return;
    }

    hideLastSelected(td);

    var selectedTable = td.dataset.tbl;
    readColumnNames(getCheckedDbs(), selectedTable, (dbNameAndColumns) => {
        var dbName = dbNameAndColumns[0];
        var columnNames = dbNameAndColumns[1];
        var pkTable = tables[dbName].rendered.find(r => r.TABLES === selectedTable);
        var pks = (pkTable && pkTable.pks.length > 0) ? pkTable.pks.map(pk => pk.COLUMN_NAME) : [];
        renderCheckboxesForTableColumns(dbName, selectedTable, columnNames, pks);
        td.dataset.columnsloaded = 'true';
        getRowCountOfTable(dbName, selectedTable, (cnt) => td.find(`#tbl${dbName} .cnt`).innerHTML += ` [${cnt} rows]`);
    });
}

function getRowCountOfTable(dbName, tbl, callback) {
    var sql = `SELECT COUNT(*) AS cnt FROM ${tbl}`;
    fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(Err.handle).then(
        response => response.json().then(rows => callback(rows[0].CNT))
    ).catch(Err.handleFetch);
}

function hideLastSelected(td) {
    if (lastClickedTdInOverview != null && lastClickedTdInOverview != td) {
        if (lastClickedTdInOverview.children.length > 0)
            lastClickedTdInOverview.find('.tableSelected').addClass('hidden');
    }
    lastClickedTdInOverview = td;
}

function renderCheckboxesForTableColumns(dbName, selectedTable, columnNames, primaryKeys) {
    var allTdsInTableForDbname = $all('#tbl' + dbName + ' td');
    var td = allTdsInTableForDbname.find(cell => cell.innerText.includes(selectedTable));
    if (td === undefined)
        return;
    var innerHTML = 'No columns in table';
    if (columnNames.length > 0) {
        innerHTML = '<input type="checkbox" class="star" name="star" onchange="selectAsterisk(this)">* &nbsp;&nbsp;';
        columnNames.forEach(c => {
            var classPk = primaryKeys.includes(c) ? 'class="primaryKey"' : '';
            innerHTML += `<input type="checkbox" class="col" name="${c}" onchange="addColToSelect(this)" value="${c}">`;
            innerHTML += `<span ${classPk}>${c}</span>`;
        });
    }
    innerHTML += '<span class="cnt"></span>';
    td.innerHTML += `<div class="tableSelected">${innerHTML}</div>`;
}

function readColumnNames(dbs, selectedTable, callback) {
    dbs.forEach(dbName => {
        var sql = `SELECT (LISTAGG(column_name, ',') WITHIN GROUP (ORDER BY column_id)) cols 
            FROM sys.all_tab_columns WHERE table_name = '${selectedTable}' AND owner = UPPER('${dbName}')`;
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(Err.handle).then(
            response => {
                response.json().then(js => {
                    var cols = js.length === 0 ? [] : js[0].COLS.split(',');
                    callback([dbName, cols]);
                });
            }
        ).catch(Err.handleFetch);
    });
}

function selectAsterisk(checkbox) {
    var td = checkbox.closest('td');
    var checkboxesInTd = Array.from(td.getElementsByTagName('input'));
    var starIsChecked = checkbox.checked;
    checkboxesInTd.forEach(c => { c.checked = starIsChecked; });

    if (starIsChecked) {
        var selectedTable = td.dataset.tbl;
        var sql = 'SELECT * FROM ' + selectedTable;
        $('.row.generatedSql').show();
        $('#txtSql').innerHTML = sql;
    } else {
        $('.row.generatedSql').hide();
        $('#divTableContents').empty();
    }
}

function addColToSelect(checkbox) {
    var td = checkbox.closest('td');
    var selectedTable = td.dataset.tbl;
    var checkboxesInTd = Array.from(td.getElementsByTagName('input'));
    $('.star').checked = false;

    var cols = [];
    checkboxesInTd.forEach(c => { if (c.checked) cols.push(c.value); });
    if (cols.length > 0) {
        var colsJoined = cols.join(',');
        var sql = `SELECT ${colsJoined} FROM ${selectedTable}`;
        $('.row.generatedSql').show();
        $('#txtSql').innerHTML = sql.replace('%c', cols.join(','));
    } else {
        $('.row.generatedSql').hide();
    }
}

function tdMouseEnterInOverview(e) {
    var selectedTable = e.target.dataset.tbl;
    var allTds = getAllTableCellsInOverview();
    allTds.forEach(c => {
        var tblInCell = c.innerHTML;
        if (tblInCell === selectedTable) {
            c.addClass('hover');
        }
    });
}

function tdMouseLeaveInOverview() {
    var allTds = getAllTableCellsInOverview();
    allTds.forEach(c => c.removeClass('hover'));
}

function sortBy(elem, col, reverse) {
    var tableToBeUpdated = elem.closest('table');
    var dbName = tableToBeUpdated.id.substring(3);
    rows.all[dbName].sort((a, b) => reverse ? a[col].localeCompare(b[col]) : b[col].localeCompare(a[col]));
    tableToBeUpdated.innerHTML = createTable(rows.all[dbName], dbName, false);
}

/** Toggles Filter visibility (textfield) in table header */
function toggleFilter(th) {
    // Element after <th> is <input text ...>, this is to be toggled
    var inputElem = th.nextElementSibling;
    inputElem.toggleClass('vHidden');
}

function filterChanged(elem, col) {
    var tableToBeUpdated = elem.closest('table');
    var dbName = tableToBeUpdated.id.substring(3);
    var filteredRows = rows.all[dbName].filter(row => row[col].includes(elem.value));
    tableToBeUpdated.innerHTML = createTable(filteredRows, dbName, false);
    $('.resultCount').innerHTML = getRowCount(performance.now(), filteredRows.length);
}

function execSql(sql, isOwnSql) {
    if (getCheckedDbs().length === 0) {
        alert('Please choose a Database');
        return;
    }
    if (sql === "") {
        alert('Please enter a SQL statement');
        return;
    }

    sql = enhanceSelectStatement(sql, isOwnSql);

    var t1ms = parseInt(window.performance.now());
    if (isOwnSql)
        $('.loadingOwn').show();
    else
        $('.loading').show();
    var dbs = getCheckedDbs();
    var lastDb = dbs[dbs.length - 1];

    $('#divTableContents').empty();
    var divTableContentInnerHTML = '';
    dbs.forEach(dbName => {
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(Err.handleSql).then(response => {
            response.json().then(rowsFromDb => {
                $('.loading').hide();
                $('.loadingOwn').hide();
                $('#sqlError').empty();

                rows.all[dbName] = rowsFromDb;
                var h3 = `<h3>${dbName}</h3>`;
                var tbl = createTable(rows.all[dbName], dbName, false);
                var rowCount = getRowCount(t1ms, rows.all[dbName].length);
                var wrapperForH3AndTbl = `<div class="tblWrapper">${h3}${tbl}${rowCount}</div>`;
                divTableContentInnerHTML += wrapperForH3AndTbl;

                if (rows.all[dbName].length > 0) {
                    // Get Database columns (e.g. col1, col2) as array
                    rows.fields = Object.keys(rows.all[dbName][0]);
                }

                if (dbName === lastDb) {
                    $('#divTableContents').innerHTML = divTableContentInnerHTML;

                    compareTables(rows.all[dbs[0]], rows.all[dbs[1]], dbs);
                    if (rows.areDifferent)
                        $('#comparisonButtons').show();
                    else
                        $('#comparisonButtons').hide();

                    alignTablesHorizontally('#divTableContents .tblWrapper', dbs.length);
                    window.scrollTo(0, $('.generatedSql').offsetTop);
                    addMouseEnterEventsInAllRows($(`#divTableContents #tbl${dbs[0]}`));
                }
            });
        }).catch(Err.handleFetch);
    });
}

/**
 * Enrich SELECT statement with WHERE + ORDER BY + rownum
 */
function enhanceSelectStatement(sql, isOwnSql) {
    var where = isOwnSql ? '' : $('#txtWhere').innerHTML,
        orderBy = isOwnSql ? '' : $('#txtOrderBy').innerHTML,
        txtMaxRows = isOwnSql ? $('#txtMaxOwnRows').value : $('#txtMaxRows').value;
    if (isOwnSql) { // own SELECT statement
        if (sql.includes('WHERE ')) {
            sql = sql.replace('WHERE ', `WHERE rownum <= ${txtMaxRows} AND `);
        } else if (sql.includes('ORDER BY')) {
            sql = sql.replace('ORDER BY', `WHERE rownum <= ${txtMaxRows} ORDER BY`);
        } else {
            sql += `WHERE rownum <= ${txtMaxRows}`;
        }
    } else { // generated SELECT statement
        sql += where !== '' ? ' WHERE ' + where : '';
        sql += where.toLowerCase().includes('rownum') ? '' : (where === '' ? ` WHERE rownum <= ${txtMaxRows}` : ` AND rownum <= ${txtMaxRows}`);
        sql += orderBy !== '' ? ' ORDER BY ' + orderBy : '';
    }

    return sql;
}

function addMouseEnterEventsInAllRows(tbl) {
    var trs = Array.from(tbl.querySelectorAll('tbody tr'));
    var idxOfIdColumn = rows.fields.indexOf(rows.fieldId);

    if (idxOfIdColumn > -1) {
        trs.forEach(tr => {
            tr.addEventListener('mouseenter', (e) => {
                var t = e.target;
                var rowId = t.children[idxOfIdColumn].innerText;

                var dbs = getCheckedDbs();
                var tbl1Trs = $all(`#divTableContents #tbl${dbs[1]} tbody tr`);
                tbl1Trs.forEach(trX => trX.removeClass('hover'));
                for (var i = 0; i < tbl1Trs.length; i++) {
                    var tdWithId = tbl1Trs[i].children[idxOfIdColumn];
                    if (tdWithId.innerText === rowId) {
                        tbl1Trs[i].addClass('hover');
                        break;
                    }
                }
            });
        });
    }
}

function createTable(rows, dbName, isOverview) {
    var tbl = `<table id="tbl${dbName}" class="tblSql">\n  <thead>%h</thead>\n  <tbody>%b</tbody>\n</table>`;
    var th = '<th>%s <input type="text" class="filter vHidden" onchange="filterChanged(this, \'%c\')"> </th>';
    var td = isOverview ? '<td data-tbl="%t" data-cnt="%c">%s</td>' : '<td>%s</td>';

    // create table header
    var headers = rows && rows.length > 0 ? Object.keys(rows[0]) : ['empty'];
    var tr = '',
        i = 0;
    var thead = '',
        tbody = '';
    headers.forEach(h => {
        if (h !== 'hasEqual' && h !== 'hasDiff' && h !== 'NUM_ROWS') // TODO -> ugly 
            tr += th.replace('%s', h + addSortingInTableHeader(h, i++)).replace('%c', h);
    });
    thead = `<tr>${tr}</tr>`;

    // create table body
    rows.forEach(r => {
        tr = '';
        if (isOverview) {
            tr += td.replace('%s', r.TABLES).replace('%t', r.TABLES).replace("%c", r.NUM_ROWS);
        } else {
            headers.forEach(h => {
                if (h !== 'hasEqual' && h !== 'hasDiff') { // TODO -> ugly 
                    if (!r[h]) // undefined, because db column is empty
                        r[h] = '';
                    tr += td.replace('%s', r[h]);
                }
            });
        }
        tbody += `<tr>${tr}</tr>`;
    });
    return tbl.replace('%h', thead).replace('%b', tbody);
}

/**
 * Render spans with ↑↓ for sorting and ⌕ for filtering
 * @returns A string with 3 spans
 */
function addSortingInTableHeader(col, idx) {
    return `<span onclick="sortBy(this, '${col}', false)">↑</span>` +
        `<span onclick="sortBy(this, '${col}', true)">↓</span>` +
        `<span onclick="toggleFilter(this)">⌕</span>`;
}

function getRowCount(t1ms, count) {
    var duration = parseInt(window.performance.now() - t1ms);
    return `<div class="resultCount">Showing ${count} results. Time: ${duration} ms</div>`;
}

document.addEventListener("DOMContentLoaded", () => {
    getDbNames().then(dbName => renderDbCheckboxes(dbName)).
    then(checkedDbs => {
        readTablesForOverview(checkedDbs);
        pingDbs();
    });
});