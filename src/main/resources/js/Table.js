/* Table.js */
/* jshint esversion: 6 */
/* globals $, window, document, fetch, localStorage, console, $all: false */
"use strict";

var Table = {
    create: function(rows, dbName, isOverview, visibleColumns) {
        var tbl = `<table id="tbl${dbName}" data-dbname="${dbName}" class="tblSql">\n  <thead>%h</thead>\n  <tbody>%b</tbody>\n</table>`;
        var th = '<th>%s <input type="text" class="filter vHidden" onchange="filterChanged(this, \'%c\')"> </th>';

        // create table header
        var tr = '',
            thead = '',
            tbody = '';
        visibleColumns.forEach(h => {
            tr += th.replace('%s', h + Table.addSortingInHeader(h)).replace('%c', h);
        });
        thead = `<tr>${tr}</tr>`;

        // create table body
        rows.forEach(r => {
            tr = '';
            if (isOverview) {
                tr += `<td data-tbl="${r.TABLE_NAME}" data-cnt="${r.NUM_ROWS}">${r.TABLE_NAME}</td>`;
            } else {
                visibleColumns.forEach(h => {
                    if (!r[h]) // undefined, because db column is empty
                        r[h] = '';
                    tr += `<td>${r[h]}</td>`;
                });
            }
            tbody += `<tr data-idx=${r.idx}>${tr}</tr>`;
        });
        return tbl.replace('%h', thead).replace('%b', tbody);
    },

    /**
     * Render spans with ↑↓ for sorting and ⌕ for filtering
     * @returns A string with 3 spans
     */
    addSortingInHeader: function(col) {
        return `<span onclick="sortBy(this, '${col}', false)">↑</span>` +
            `<span onclick="sortBy(this, '${col}', true)">↓</span>` +
            `<span onclick="toggleFilter(this)">⌕</span>`;
    }
};