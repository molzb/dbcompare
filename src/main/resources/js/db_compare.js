/* db_compare.js */
/* jshint esversion: 6 */
/* globals $, $all: false */
'use strict';
var rowsOriginal = {};
var rows = {};
var rowFields = [];
var rowFieldId = '';
var rowsDifferent = {};
var rowsIdentical = {};
var rowsWithSameId = {};
var rowsAreDifferent = false;
var rowsOnlyIn = {};

function jsonIsEqual(json1, json2) {
    if (json1 === json2)
        return true;
    var isEqual = true;
    for (var i = 0; i < rowFields.length; i++) {
        if (json1[rowFields[i]] !== json2[rowFields[i]]) {
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
    rowsAreDifferent = JSON.stringify(rows1) !== JSON.stringify(rows2);
    if (rowsAreDifferent) {
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
    rowsDifferent[db1] = jsonClone(rowsOriginal[db1].filter(r => r.hasEqual == undefined));
    rowsDifferent[db2] = jsonClone(rowsOriginal[db2].filter(r => r.hasEqual == undefined));
    rowsIdentical[db1] = jsonClone(rowsOriginal[db1].filter(r => r.hasEqual));
    rowsIdentical[db2] = jsonClone(rowsOriginal[db2].filter(r => r.hasEqual));
    compareRowsWithSameIds(rowsDifferent[db1], rowsDifferent[db2]);

    rowsWithSameId[db1] = jsonClone(rowsDifferent[db1].filter(r => r.hasDiff));
    rowsWithSameId[db2] = jsonClone(rowsDifferent[db2].filter(r => r.hasDiff));
    rowsOnlyIn[db1] = jsonClone(rowsDifferent[db1].filter(r => r.hasDiff == undefined));
    rowsOnlyIn[db2] = jsonClone(rowsDifferent[db2].filter(r => r.hasDiff == undefined));

    var diff1Len = rowsDifferent[db1].length,
        diff2Len = rowsDifferent[db2].length;
    var result = `Result: Equal rows: ${rowsIdentical[db1].length}, different rows: ${diff1Len}/${diff2Len}`;
    $('#comparisonResult').innerHTML = rowsAreDifferent ? result : 'All rows are identical';
}

function compareRowsWithSameIds(rows1, rows2) {
    // TODO Read Resultset Metadata
    var fieldsWithId = rowFields.filter(f => f.toLowerCase().startsWith('id') || f.toLowerCase().endsWith('id'));
    if (fieldsWithId.length === 0) {
        return;
    }
    rowFieldId = fieldsWithId[0].toString();
    for (var i1 = 0; i1 < rows1.length; i1++) {
        for (var i2 = 0; i2 < rows2.length; i2++) {
            if (rows1[i1][rowFieldId] === rows2[i2][rowFieldId]) {
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
}

function showInBothButDifferent() {
    getCheckedDbs().forEach(db => showResultTable(db, rowsDifferent));
}

function showAllRows() {
    getCheckedDbs().forEach(db => showResultTable(db, rowsOriginal));
}

function showOnlyInSource() {
    var db = getCheckedDbs()[0];
    showResultTable(db, rowsOnlyIn);
}

function showOnlyInTarget() {
    var db = getCheckedDbs()[1];
    showResultTable(db, rowsOnlyIn);
}

function showIdentical() {
    getCheckedDbs().forEach(db => showResultTable(db, rowsIdentical));
}

function keyupSql(e) {
    if (e.keyCode === 13) {
        execSql($('#txtSql').innerHTML);
    }
    return false;
}

function getDbNames(callback) {
    return new Promise((resolve, reject) => {
        fetch('conns.json').then(response => {
            response.json().then(json => {
                resolve(json.dbNames);
            });
        });
    });
}

function renderDbCheckboxes(dbNames) {
    var chks = '';
    dbNames.forEach(j => {
        var lbl = `<span class="tooltip">${j}  | </span>`;
        chks += `<input type="checkbox" name="${j}" onchange="readTablesForOverview(getCheckedDbs())" value="${j}">${lbl}`;
    });
    $('#chkDbs').innerHTML = chks;

    // retrieve checked DBs from localStorage
    var checkedDbs = [];
    if (localStorage.getItem("dbc_checkedDbs") != null) {
        checkedDbs = localStorage.getItem("dbc_checkedDbs").split(",");
        $all('#chkDbs input').forEach(c => {
            if (checkedDbs.includes(c.value)) c.checked = true;
        });
    }
    return new Promise((resolve, reject) => resolve(checkedDbs));
}

function getCheckedDbs() {
    var checkedDbs = [];
    $all("#chkDbs input").forEach(chk => {
        if (chk.checked) {
            checkedDbs.push(chk.value);
        }
    });
    return checkedDbs;
}

// Show tables with 0 rows in DB overview?
function toggleEmptyTables(checked) {
    readTablesForOverview(getCheckedDbs());
}

// Ping all databases in db.properties and disable checkboxes if necessary
function pingDbs() {
    fetch('pingDBs.json').then(response => {
        response.json().then(js => {
            var dbAvailable = js;
            var i = 0;
            $all('#chkDbs input').forEach(c => {
                var available = dbAvailable[i++];
                if (!available) {
                    c.nextElementSibling.innerHTML += '<span class="tooltiptext">DB not available</span>';
                    c.disabled = true;
                }
            });
        });
    });
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

    var sql = "SELECT (table_name || ', ' || TO_CHAR(num_rows,'9,999,999,999') || ' rows') tables ";
    sql += "FROM sys.all_tables WHERE owner = '%o' %s ORDER BY table_name";
    sql = sql.replace('%s', showEmptyTables ? "" : "AND num_rows > 0");

    // do a SELECT for the tables in the database
    dbs.forEach(dbName => {
        var sqlDb = sql.replace('%o', dbName);
        fetch('select.json', { method: 'post', body: dbName + ';' + sqlDb }).then(
            response => {
                if (response.status === 400) {
                    response.json().then(j => $('#txtErrorDb').innerHTML += j.error);
                    return;
                }

                response.json().then(rows => {
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
        ).catch(error => {
            $('#txtErrorDb').innerHTML += error;
        });
    });
}

// split tables horizontally, e.g. tbl1 33%| tbl2 33%| tbl3 33%
function alignTablesHorizontally(div, numberOfTables) {
    $all(div).forEach(t => {
        t.style.width = (98 / numberOfTables) + '%';
    });
}

function grayOutTablesWithZeroRows() {
    $all('#divTableComparison .tblSql td').forEach(cell => {
        if (cell.innerHTML.includes(" 0 rows"))
            cell.classList.add('gray');
    });
}

function getAllTableCellsInOverview() {
    return $all('#divTableComparison .tblSql td');
}

function addMouseEventsForTds() {
    var allTds = getAllTableCellsInOverview();
    console.log("add events: " + allTds.length);
    allTds.forEach(td => {
        td.addEventListener('mouseenter', tableCellMouseEnter);
        td.addEventListener('mouseleave', tableCellMouseLeave);
        td.addEventListener('click', showColumnsOfTable);
    });
}

function removeMouseEventsForTds() {
    var allTds = getAllTableCellsInOverview();
    console.log("remove events: " + allTds.length);
    allTds.forEach(td => {
        td.removeEventListener('mouseenter', tableCellMouseEnter);
        td.removeEventListener('mouseleave', tableCellMouseLeave);
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
        td.children[0].classList.remove('hidden'); // wrapping div for checkboxes
        hideLastSelected(td);
        return;
    }

    hideLastSelected(td);

    var selectedTable = td.dataset.tbl;
    readColumnNames(getCheckedDbs(), selectedTable, (dbNameAndColumns) => {
        var dbName = dbNameAndColumns[0];
        var columnNames = dbNameAndColumns[1];
        renderCheckboxesForTableColumns(dbName, selectedTable, columnNames);
        td.dataset.columnsloaded = 'true';
    });
}

function hideLastSelected(td) {
    if (lastClickedTdInOverview != null && lastClickedTdInOverview != td) {
        lastClickedTdInOverview.children[0].classList.add('hidden');
    }
    lastClickedTdInOverview = td;
}

function renderCheckboxesForTableColumns(dbName, selectedTable, columnNames) {
    var allTdsInTableForDbname = $all('#tbl' + dbName + ' td');
    var tds = allTdsInTableForDbname.filter(currentTd => currentTd.innerText.includes(selectedTable));
    if (tds.length === 0)
        return;
    var td = tds[0];
    var innerHTML = '';
    if (columnNames.length === 0) {
        innerHTML += 'No columns in table';
    } else {
        innerHTML += '<input type="checkbox" class="star" name="star" onchange="selectAsterisk(this)">* &nbsp;&nbsp;';
        columnNames.forEach(c => {
            innerHTML += `<input type="checkbox" class="col" name="${c}" onchange="addColToSelect(this)" value="${c}">${c}`;
        });
    }
    td.innerHTML += `<div class="tableSelected">${innerHTML}</div>`;
}

function readColumnNames(dbs, selectedTable, callback) {
    dbs.forEach(dbName => {
        var sql = "SELECT (LISTAGG(column_name, ',') WITHIN GROUP (ORDER BY column_id)) cols " +
            "FROM sys.all_tab_columns WHERE table_name = '%t' AND owner = UPPER('%o')";
        sql = sql.replace('%t', selectedTable).replace('%o', dbName);
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(
            response => {
                response.json().then(js => {
                    var cols = js.length === 0 ? [] : js[0].COLS.split(',');
                    callback([dbName, cols]);
                });
            }
        );
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
    var checkboxesInTd = Array.from(td.getElementsByTagName('input'));
    $('.star').checked = false;

    var sql = 'SELECT %c FROM %t';
    var cols = [];
    checkboxesInTd.forEach(c => { if (c.checked) cols.push(c.value); });
    if (cols.length > 0) {
        var selectedTable = td.dataset.tbl;
        $('.row.generatedSql').show();
        $('#txtSql').innerHTML = sql.replace('%c', cols.join(',')).replace('%t', selectedTable);
    } else {
        $('.row.generatedSql').hide();
    }
}

function tableCellMouseEnter(e) {
    var selectedTable = e.target.dataset.tbl;
    var allTds = getAllTableCellsInOverview();
    allTds.forEach(c => {
        var tblInCell = c.innerHTML.split(",")[0];
        if (tblInCell === selectedTable) {
            c.classList.add('hover');
        }
    });
}

function tableCellMouseLeave() {
    var allTds = getAllTableCellsInOverview();
    allTds.forEach(c => c.classList.remove('hover'));
}

function sortBy(elem, col, reverse) {
    var tableToBeUpdated = elem.closest('table');
    var dbName = tableToBeUpdated.id.substring(3);
    rows[dbName].sort((a, b) => reverse ? a[col].localeCompare(b[col]) : b[col].localeCompare(a[col]));
    tableToBeUpdated.innerHTML = createTable(rows[dbName], dbName, false);
}

/** Toggles Filter visibility (textfield) in table header */
function toggleFilter(th) {
    // Element after <th> is <input text ...>, this is to be toggled
    var inputElem = th.nextElementSibling;
    var classList = inputElem.classList;
    classList.contains('vHidden') ? classList.remove('vHidden') : classList.add('vHidden');
}

function filterChanged(elem, col) {
    var tableToBeUpdated = elem.closest('table');
    var dbName = tableToBeUpdated.id.substring(3);
    var rows = rowsOriginal[dbName].filter(row => row[col].includes(elem.value));
    tableToBeUpdated.innerHTML = createTable(rows, dbName, false);
    $('.resultCount').innerHTML = getRowCount(performance.now(), rows.length);
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

    var where = isOwnSql ? '' : $('#txtWhere').innerHTML,
        orderBy = isOwnSql ? '' : $('#txtOrderBy').innerHTML,
        txtMaxRows = isOwnSql ? $('#txtMaxOwnRows').value : $('#txtMaxRows').value;
    if (isOwnSql) {
        if (sql.includes('WHERE ')) {
            sql = sql.replace('WHERE ', `WHERE rownum <= ${txtMaxRows} AND `);
        } else if (sql.includes('ORDER BY')) {
            sql = sql.replace('ORDER BY', `WHERE rownum <= ${txtMaxRows} ORDER BY`);
        } else {
            sql += `WHERE rownum <= ${txtMaxRows}`;
        }
    } else {
        sql += where !== '' ? ' WHERE ' + where : '';
        sql += where.toLowerCase().includes('rownum') ? '' : (where === '' ? ` WHERE rownum <= ${txtMaxRows}` : ` AND rownum <= ${txtMaxRows}`);
    }

    sql += orderBy !== '' ? ' ORDER BY ' + orderBy : '';

    var t1ms = parseInt(window.performance.now());
    isOwnSql ? $('.loadingOwn').show() : $('.loading').show();
    var dbs = getCheckedDbs();
    var lastDb = dbs[dbs.length - 1];

    $('#divTableContents').empty();
    dbs.forEach(dbName => {
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(response => {
            if (response.status === 400) { // Bad Request
                response.text().then(data => {
                    $('#txtError').innerHTML += ': ' + data;
                });
                showError('Cannot parse SQL');
            } else { // Request is ok
                response.json().then(rowsFromDb => {
                    $('.loading').hide();
                    $('.loadingOwn').hide();
                    $('#txtError').empty();

                    rows[dbName] = rowsFromDb;
                    rowsOriginal[dbName] = jsonClone(rowsFromDb);
                    var h3 = `<h3>${dbName}</h3>`;
                    var tbl = createTable(rows[dbName], dbName, false);
                    var rowCount = getRowCount(t1ms, rows[dbName].length);
                    var wrapperForH3AndTbl = `<div class="tblWrapper">${h3}${tbl}${rowCount}</div>`;
                    $('#divTableContents').innerHTML += wrapperForH3AndTbl;

                    if (rows[dbName].length > 0) {
                        // Get Database columns (e.g. col1, col2) as array
                        rowFields = Object.keys(rowsOriginal[dbName][0]);
                    }

                    if (dbName === lastDb) {
                        compareTables(rowsOriginal[dbs[0]], rowsOriginal[dbs[1]], dbs);
                        if (rowsAreDifferent)
                            $('#comparisonButtons').show();
                        else
                            $('#comparisonButtons').hide();

                        alignTablesHorizontally('#divTableContents .tblWrapper', dbs.length);
                        window.scrollTo(0, $('.generatedSql').offsetTop);
                        addMouseEnterEventsInAllRows($(`#divTableContents #tbl${dbs[0]}`));
                    }
                });
            }
        }).catch(error => showError(error));
    });
}

function addMouseEnterEventsInAllRows(tbl) {
    var trs = Array.from(tbl.querySelectorAll('tbody tr'));
    var idxOfIdColumn = rowFields.indexOf(rowFieldId);

    if (idxOfIdColumn > -1) {
        trs.forEach(tr => {
            tr.addEventListener('mouseenter', (e) => {
                var t = e.target;
                var rowId = t.children[idxOfIdColumn].innerText;

                var dbs = getCheckedDbs();
                var tbl1Trs = $all(`#divTableContents #tbl${dbs[1]} tbody tr`);
                tbl1Trs.forEach(trX => trX.classList.remove('hover'));
                tbl1Trs.forEach(trX => {
                    if (trX.children[idxOfIdColumn].innerText === rowId) {
                        trX.classList.add('hover');
                    }
                });
            });
        });
    }
}

function showError(error) {
    if ($('.resultCount'))
        $('.resultCount').empty();
    $('#txtError').innerHTML = error;
    $('.loading').hide();
    $('.loadingOwn').hide();
}

function createTable(rows, dbName, isOverview) {
    var tbl = `<table id="tbl${dbName}" class="tblSql">\n  <thead>%h</thead>\n  <tbody>%b</tbody>\n</table>`;
    var th = '<th>%s <input type="text" class="filter vHidden" onchange="filterChanged(this, \'%c\')"> </th>';
    var td = isOverview ? '<td data-tbl="%t">%s</td>' : '<td>%s</td>';

    // create table header
    var headers = rows && rows.length > 0 ? Object.keys(rows[0]) : ['empty'];
    var tr = '',
        i = 0;
    var thead = '',
        tbody = '';
    headers.forEach(h => {
        if (h !== 'hasEqual' && h !== 'hasDiff') // TODO -> ugly 
            tr += th.replace('%s', h + addSortingInTableHeader(h, i++)).replace('%c', h);
    });
    thead = `<tr>${tr}</tr>`;

    // create table body
    rows.forEach(r => {
        tr = '';
        headers.forEach(h => {
            if (h !== 'hasEqual' && h !== 'hasDiff') { // TODO -> ugly 
                if (!r[h]) // undefined, because db column is empty
                    r[h] = '';
                tr += isOverview ? td.replace('%s', r[h]).replace('%t', r[h].split(",")[0]) : td.replace('%s', r[h]);
            }
        });
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
    getDbNames().then(dbNames => renderDbCheckboxes(dbNames)).
    then(checkedDbs => {
        readTablesForOverview(checkedDbs);
        pingDbs();
    });
});