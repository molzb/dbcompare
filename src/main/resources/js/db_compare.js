/* db_compare.js */
/* jshint esversion: 6 */
/* globals $, Err, Table, window, document, fetch, localStorage, console, $all: false */
'use strict';
var tables = {};
var selectedTable = '';

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

// rows.all["DOXIS"] = 
// { cols: {LOG_DATE: '2019-12-21 18:31:16', LOG_LVL: 'INFO', LOG_MSG: 'Test', LOG_ID: '1'}, hasEqual: 0, pk: ["x","y"], hasDiff : 2, fields : ["LOG_DATE", "LOG_LVL"]}
function jsonIsEqual(json1, json2, colsToCompare) {
    if (json1 === json2)
        return true;
    var isEqual = true;
    for (var i = 0; i < colsToCompare.length; i++) {
        var col = colsToCompare[i];
        if (json1[col] !== json2[col]) {
            isEqual = false;
            break;
        }
    }
    return isEqual;
}

/**
 * Compares the resultset selected databases<br>
 * If the row in one databases is equal to a row in the other db, it creates a
 * reference rows1[x].hasEqual=indexInRows2 and rows2[x].hasEqual=indexInRows1  
 * @param {*} rows1 resultset of database 1 
 * @param {*} rows2 resultset of database 2
 * @param {*} checkedDbs the selected databases
 */
function compareTables(rows1, rows2, checkedDbs, tbl, colsToCompare) {
    rows.areDifferent = JSON.stringify(rows1) !== JSON.stringify(rows2);
    if (rows.areDifferent) {
        for (var i1 = 0; i1 < rows1.length; i1++) {
            for (var i2 = 0; i2 < rows2.length; i2++) {
                if (!rows1[i1].hasEqual && !rows2[i2].hasEqual && jsonIsEqual(rows1[i1], rows2[i2], colsToCompare)) {
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
    rows.different[db1] = rows.all[db1].filter(r => r.hasEqual == undefined);
    rows.different[db2] = rows.all[db2].filter(r => r.hasEqual == undefined);
    rows.identical[db1] = rows.all[db1].filter(r => r.hasEqual);
    rows.identical[db2] = rows.all[db2].filter(r => r.hasEqual);
    compareRowsWithSameIds(rows.different[db1], rows.different[db2], tbl, colsToCompare);

    rows.withSameId[db1] = rows.different[db1].filter(r => r.hasDiff);
    rows.withSameId[db2] = rows.different[db2].filter(r => r.hasDiff);
    rows.onlyIn[db1] = rows.different[db1].filter(r => r.hasDiff == undefined);
    rows.onlyIn[db2] = rows.different[db2].filter(r => r.hasDiff == undefined);

    var diff1Len = rows.different[db1].length,
        diff2Len = rows.different[db2].length;
    var result = `Result: Equal rows: ${rows.identical[db1].length}, different rows: ${diff1Len}/${diff2Len}`;
    $('#comparisonResult span').innerHTML = rows.areDifferent ? result : 'All rows are identical';
}

function getPrimaryKeysOfTable(tbl) {
    var pksStruct = tables[getCheckedDbs()[0]].find(t => t.TABLE_NAME == tbl).pks;
    if (pksStruct.length === 0) {
        return [];
    }
    return Array.from(new Set(pksStruct.map(t => t.COLUMN_NAME))); // PKS without duplicates
}

function compareRowsWithSameIds(rows1, rows2, tbl, colsToCompare) {
    var pks = getPrimaryKeysOfTable(tbl);
    var colsWithoutPk = colsToCompare.filter(f => !pks.includes(f)); // the cols that will be checked for changes

    var pkLen = pks.length;
    for (var i1 = 0; i1 < rows1.length; i1++) {
        for (var i2 = 0; i2 < rows2.length; i2++) {
            var row1 = rows1[i1],
                row2 = rows2[i2];
            var equalInPrimaryField = false;
            // I suppose here, that we have max 3 primary keys
            if (pkLen >= 1) // verbose style for better readibility
                equalInPrimaryField = row1[pks[0]] == row2[pks[0]];
            if (equalInPrimaryField && pkLen >= 2)
                equalInPrimaryField = row1[pks[1]] == row2[pks[1]];
            if (equalInPrimaryField && pkLen >= 3)
                equalInPrimaryField = row1[pks[2]] == row2[pks[2]];

            if (equalInPrimaryField) {
                row1.hasDiff = row2.idx;
                row2.hasDiff = row1.idx;
                hilightDiffInRow(row1, row2, colsWithoutPk);
                break;
            }
        }
    }
}

function hilightDiffInRow(row1, row2, colsWithoutPk) {
    var diffInCols = [];
    colsWithoutPk.forEach(col => {
        if (row1[col] !== row2[col]) {
            diffInCols.push(col);
        }
    });
    row1.diffInCols = diffInCols;
    row2.diffInCols = diffInCols;

    row1.diffInCols.forEach(c => row1[c] = '<span class="diff">' + row1[c] + '</span>');
    row2.diffInCols.forEach(c => row2[c] = '<span class="diff">' + row2[c] + '</span>');
}

function showResultTable(dbName, theseRows) {
    var tblForDB = $("#sqlResult #tbl" + dbName);
    var count = theseRows[dbName].length;
    tblForDB.innerHTML = Table.create(theseRows[dbName], dbName, false, rows.all[dbName].fields);
    tblForDB.nextElementSibling.innerHTML = `Showing ${count} results.`;
    addMouseEnterToHighlightCounterpart($(`#divTableContents #tbl${dbName}`));
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

/**
 * Add a field idx to this json array to better identify a record<br/>
 * Example: jsonArray = [{"key": "v1"},{"key": "v2"}] -> [{"key": "v1", idx: 0}, {"key": "v2", idx: 1}...
 */
function enrichWithIndex(jsonArray) {
    var idx = 0;
    jsonArray.forEach(j => j.idx = idx++); // add index to better identify these tables
    return jsonArray;
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

    var sql = "SELECT table_name, num_rows FROM sys.all_tables WHERE owner = '%o' %s ORDER BY table_name";
    sql = sql.replace('%s', showEmptyTables ? "" : "AND num_rows > 0");

    // do a SELECT for the tables in the database
    dbs.forEach(dbName => {
        var sqlDb = sql.replace('%o', dbName);
        fetch('select.json', { method: 'post', body: dbName + ';' + sqlDb }).then(Err.handle).then(
            response => {
                response.json().then(tbls => {
                    tables[dbName] = enrichWithIndex(tbls);
                    readPrimaryKeysOfTables(dbName, tables[dbName]);

                    var h3 = `<h3>${dbName}</h3>`;
                    var tbl = Table.create(tables[dbName], dbName, true, ["TABLES"]);
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
            tablesToEnrich.forEach(t => {
                var pksForTable = pks.filter(pk => pk.TABLE_NAME === t.TABLE_NAME);
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

    selectedTable = td.dataset.tbl;
    readColumnNames(getCheckedDbs(), selectedTable, (dbNameAndColumns) => {
        var dbName = dbNameAndColumns[0];
        var columnNames = dbNameAndColumns[1];
        var pks = getPrimaryKeysOfTable(selectedTable);
        renderCheckboxesForTableColumns(dbName, selectedTable, columnNames, pks);
        td.dataset.columnsloaded = 'true';
        getRowCountOfTable(dbName, selectedTable, (cnt) => {
            if (dbName == getCheckedDbs()[0]) // ugly! TODO
                td.find(`#tbl${dbName} .cnt`).innerHTML += ` [${cnt} rows]`;
            else
                $(`#tbl${dbName} td[data-tbl="${selectedTable}"] .cnt`).innerHTML += ` [${cnt} rows]`;
        });
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
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(Err.handle).then(response => {
            response.json().then(js => {
                var cols = js.length === 0 ? [] : js[0].COLS.split(',');
                var otherTbl = tables[dbName].find(t => t.TABLE_NAME === selectedTable);
                if (otherTbl != undefined)
                    otherTbl.cols = cols;
                callback([dbName, cols]);
            });
        }).catch(Err.handleFetch);
    });
}

function selectAsterisk(checkbox) {
    var td = checkbox.closest('td');
    var checkboxesInTd = Array.from(td.getElementsByTagName('input'));
    var starIsChecked = checkbox.checked;
    checkboxesInTd.forEach(c => { c.checked = starIsChecked; });

    if (starIsChecked) {
        selectedTable = td.dataset.tbl;
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
        $('#txtSql').innerHTML = sql.replace('%c', colsJoined);
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
    tableToBeUpdated.innerHTML = Table.create(rows.all[dbName], dbName, false, rows.all[dbName].fields);
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
    tableToBeUpdated.innerHTML = Table.create(filteredRows, dbName, false, rows.all[dbName].fields);
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

    $('#divTableContents').empty();
    var divTableContentInnerHTML = '';

    var dbs = getCheckedDbs();
    var tblExistsInOtherDb = tables[dbs[1]].find(f => f.TABLE_NAME == selectedTable) !== undefined;
    if (!tblExistsInOtherDb)
        dbs = [dbs[0]];
    var lastDb = dbs[dbs.length - 1];

    dbs.forEach(dbName => {
        fetch('select.json', { method: 'post', body: dbName + ';' + sql }).then(Err.handleSql).then(response => {
            response.json().then(rowsFromDb => {
                $('.loading').hide();
                $('.loadingOwn').hide();
                $('#sqlError').empty();

                storeTableColumnNames(rowsFromDb);
                rows.all[dbName] = enrichWithIndex(rowsFromDb);

                if (dbName === lastDb) {
                    var cols = tables[dbName].find(f => f.TABLE_NAME == selectedTable).cols;
                    if (tblExistsInOtherDb) {
                        compareTables(rows.all[dbs[0]], rows.all[dbs[1]], dbs, selectedTable, cols);
                        showComparisonButtonsIfNeeded(rows.areDifferent);
                    } else { // table exists only in 1 DB
                        $('#comparisonResult span').innerHTML = 'Table exists only in 1 database!';
                        showComparisonButtonsIfNeeded(false);
                    }

                    dbs.forEach(dbName => {
                        var h3 = `<h3>${dbName}</h3>`;
                        var tbl = Table.create(rows.all[dbName], dbName, false, rows.all[dbName].fields);
                        var rowCount = getRowCount(t1ms, rows.all[dbName].length);
                        var wrapperForH3AndTbl = `<div class="tblWrapper">${h3}${tbl}${rowCount}</div>`;
                        divTableContentInnerHTML += wrapperForH3AndTbl;
                    });
                    $('#divTableContents').innerHTML = divTableContentInnerHTML;

                    alignTablesHorizontally('#divTableContents .tblWrapper', dbs.length);
                    window.scrollTo(0, $('.generatedSql').offsetTop);
                    addMouseEnterToHighlightCounterpart($(`#divTableContents #tbl${dbs[0]}`), $(`#divTableContents #tbl${dbs[1]}`));
                }
            });
        }).catch(Err.handleFetch);
    });
}

function showComparisonButtonsIfNeeded(rowsAreDifferent) {
    if (rowsAreDifferent)
        $('#comparisonButtons').show();
    else
        $('#comparisonButtons').hide();
}

function storeTableColumnNames(rowsForDb) {
    if (rowsForDb.length > 0) {
        // Get Database columns (e.g. col1, col2) as array
        rowsForDb.fields = Object.keys(rowsForDb[0]);
    }
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
        var whereHasRownum = where.toLowerCase().includes('rownum');
        sql += where !== '' ? ' WHERE ' + where : '';
        sql += whereHasRownum ? '' : (where === '' ? ` WHERE rownum <= ${txtMaxRows}` : ` AND rownum <= ${txtMaxRows}`);
        sql += orderBy !== '' ? ' ORDER BY ' + orderBy : '';
    }

    return sql;
}

function addMouseEnterToHighlightCounterpart(tbl, otherTbl) {
    var trs = Array.from(tbl.querySelectorAll('tbody tr'));
    var pks = getPrimaryKeysOfTable(selectedTable);

    if (pks.length > 0) {
        trs.forEach(tr => {
            tr.addEventListener('mouseenter', (e) => {
                var rowIdx = tr.dataset.idx;
                var dbname = tr.closest('table').dataset.dbname;
                var rowIdxEqual = rows.all[dbname][rowIdx].hasEqual;
                var rowIdxDiff = rows.all[dbname][rowIdx].hasDiff;
                otherTbl.querySelectorAll('tr').forEach(trX => {
                    trX.removeClass('hover');
                    trX.removeClass('hoverDiff');
                });
                if (rowIdxEqual == undefined && rowIdxDiff == undefined)
                    return;

                var hasEqual = (rowIdxEqual != undefined);
                var idx = hasEqual ? rowIdxEqual : rowIdxDiff;
                var cssHover = hasEqual ? 'hover' : 'hoverDiff';
                var trToHighlight = otherTbl.find(`tr[data-idx="${idx}"]`);
                trToHighlight.addClass(cssHover);
            });
        });
    }
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