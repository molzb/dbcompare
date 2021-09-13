/* Err.js */
/* jshint esversion: 6 */
/* globals $ */
'use strict';

var Err = {
    handle: function(response) {
        if (!response.ok) {
            $('#txtErrorDb').innerHTML += "AJAX error: " + response.status + "->" + response.statusText;
            throw Error(response.statusText);
        }
        return response;
    },

    handleSql: function(response) {
        if (response.status === 400) { // Bad Request
            response.text().then(j => $('#sqlError').innerHTML = 'Cannot parse SQL: ' + j);
            Err.cleanup();
            throw Error(response.statusText);
        }
        return response;
    },

    handleFetch: function(error) {
        $('#txtErrorDb').innerHTML = error;
    },

    cleanup: function() {
        $('#comparisonResult').empty();
        if ($('.resultCount'))
            $('.resultCount').empty();
        $('.loading').hide();
        $('.loadingOwn').hide();
    }

};