package com.ing.dbcompare.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import oracle.jdbc.internal.OracleConnection;

public class Jdbc {
	public static List<Map<String, String>> getRowsFromDatabase(Connection conn, String sql) throws SQLException {
		List<Map<String, String>> rows = new ArrayList<>();
		try (PreparedStatement st = conn.prepareStatement(sql); ResultSet rs = st.executeQuery()) {
			ResultSetMetaData metaData = rs.getMetaData(); // column names from SELECT
			while (rs.next()) { // rows from SELECT
				Map<String, String> row = new HashMap<>();
				for (int i = 1; i <= metaData.getColumnCount(); i++) {
					row.put(metaData.getColumnName(i), rs.getString(i));
				}
				rows.add(row);
			}
		} catch (SQLException sqle) {
			throw sqle;
		}

		return rows;
	}

	public static Connection getDatabaseConnection(DbConnection c) throws SQLException {
		if (c.conn != null && !c.conn.isClosed()) { // get prepared connection
			return c.conn;
		}
		c.conn = DriverManager.getConnection(c.url, c.user, c.pw);
		((OracleConnection) c.conn).setDefaultRowPrefetch(100);
		return c.conn;
	}

	public static String getDbConnectionsAsJson(List<DbConnection> dbConns) {
		List<String> dbNames = new ArrayList<>();
		dbConns.forEach(c -> dbNames.add(c.name));
		return new Json().toJsonArray("dbNames", dbNames);
	}
}
