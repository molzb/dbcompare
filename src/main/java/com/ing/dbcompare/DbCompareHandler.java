package com.ing.dbcompare;

import static java.net.HttpURLConnection.HTTP_BAD_REQUEST;
import static java.net.HttpURLConnection.HTTP_OK;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import com.ing.dbcompare.util.DbConnection;
import com.ing.dbcompare.util.Http;
import com.ing.dbcompare.util.Jdbc;
import com.ing.dbcompare.util.Json;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

class DbCompareHandler implements HttpHandler {
	private Logger logger = Logger.getLogger(DbCompareHandler.class.getSimpleName());
	private List<DbConnection> dbConns;

	public void setDbConns(List<DbConnection> dbConns) {
		this.dbConns = dbConns;
		logger.info(dbConns.toString());
	}

	/**
	 * Returns HTTP responses as JSON
	 */
	@Override
	public void handle(HttpExchange t) throws IOException {
		String path = t.getRequestURI().getPath();
		switch (path) {
			case "/db/conns.json": // DBs from properties file (e.g. DOXIS2E,DOXIS4E,...)
				Http.response(t, HTTP_OK, Jdbc.getDbConnectionsAsJson(dbConns));
				break;
			case "/db/pingDBs.json": // DBs available? [true, false, true, ...]
				String jsonFromDbPings = new Json().toJsonArray(pingDbs());
				Http.response(t, HTTP_OK, jsonFromDbPings);
				break;
			case "/db/select.json": //
				String jsonFromSelect = new Json().toGson(select(t));
				Http.response(t, HTTP_OK, jsonFromSelect);
				break;
			default:
				Http.serveFile(t);
		}
	}

	/**
	 * Pings all databases which are registered in db.properties
	 * @return List with boolean values, true means db is accessible, e.g. true,true,false,true
	 */
	private List<Boolean> pingDbs() {
		List<Boolean> dbAvailable = new ArrayList<>();
		for (DbConnection conn : dbConns) {
			try {
				Jdbc.getDatabaseConnection(conn);
				dbAvailable.add(true);
			} catch (SQLException e) {
				dbAvailable.add(false);
			}
		}
		return dbAvailable;
	}

	/**
	 * format of RequestBody: [db];[SELECT...], e.g. "DOXIS2E;SELECT x FROM y"
	 * 
	 * @return resulting rows of the SELECT as JSON, e.g. [{"row1":"col1,col2"},{row2":"col1,col2"},
	 */
	private List<Map<String, String>> select(HttpExchange t) throws IOException {
		try (InputStream is = t.getRequestBody()) {
			String[] dbAndSql = new String(is.readAllBytes()).split(";"); // DOXIS2E;SELECT x FROM y
			String dbName = dbAndSql[0], sql = dbAndSql[1];
			if (!sql.toLowerCase().startsWith("select")) {
				throw new IOException("Only SELECT is allowed");
			}
			return selectFromDb(dbName, sql, t);
		} catch (IOException | SQLException e) {
			Http.response(t, HTTP_BAD_REQUEST, e.getMessage());
			return null;
		}
	}

	private List<Map<String, String>> selectFromDb(String dbName, String sql, HttpExchange t) throws SQLException {
		logger.info("DB=" + dbName + ", SQL=" + sql);
		try {
			DbConnection dbConn = dbConns.stream().filter(db -> db.name.equals(dbName)).findFirst().orElse(null);
			Connection conn = Jdbc.getDatabaseConnection(dbConn);
			return Jdbc.getRowsFromDatabase(conn, sql);
			// Jdbc.getDatabaseConnection(dbConn); // prepare Connection for the next time
		} catch (SQLException sqle) {
			if (sqle.getMessage().contains("invalid username/password")) { // cannot connect to db
				logger.severe(sqle.getMessage());
			} else {
				logger.severe(sqle.toString());
			}
			throw sqle;
		}
	}
}