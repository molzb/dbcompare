package com.ing.dbcompare;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;

import com.ing.dbcompare.util.DbConnection;
import com.ing.dbcompare.util.OrderedProperties;
import com.sun.net.httpserver.HttpServer;

/**
 * Compare tables in several databases<br>
 * The server implementation is the built-in Java 6 HttpServer. The databases
 * are configured in resources/db.properties Frontend:
 * localhost:8085/db/db_compare.html <br>
 * DB Endpoint: localhost:8085/db/select.json (+POST: e.g. {SELECT * FROM
 * tbl})<br>
 * 
 * @see com.sun.net.httpserver.HttpServer
 * 
 * @author Bernhard
 */
public class DbCompare {
	private Logger logger = Logger.getLogger(DbCompare.class.getSimpleName());
	private int port = 8085;
	private String context = "/db";
	/** See formatting options in {@link java.util.Formatter} */
	private static String oneLineLogger = "%1$tH:%1$tM:%1$tS.%1$tL %4$-6s %2$s %5$s%6$s%n";

	public static void main(String[] args) throws IOException {
		System.setProperty("java.util.logging.SimpleFormatter.format", oneLineLogger);
		new DbCompare();
	}

	public DbCompare() throws IOException {
		logger.info("\n-------------------\n- Start DbCompare -\n-------------------");
		packResources();

		HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
		DbCompareHandler handler = new DbCompareHandler();
		handler.setDbConns(loadDbProperties());
		server.createContext(context, handler);
		server.start();

		logServerStartedMessage();
	}

	public void packResources() throws IOException {
		Runtime.getRuntime().exec("packCssAndJs.bat");
		logger.info("init: Created packed.css and packed.js");
	}

	private void logServerStartedMessage() throws UnknownHostException {
		String hostName = InetAddress.getLocalHost().getHostName();
		logger.info("DbCompare started on Port " + port + ", context " + context);
		logger.info("URL: " + hostName + ":" + port + context + "/db_compare.html");
		logger.info("-----------------------------------");
	}

	private List<DbConnection> loadDbProperties() throws IOException {
		Properties props = new OrderedProperties();
		props.load(getClass().getResourceAsStream("/db.properties"));
		Enumeration<Object> keys = props.keys();
		List<DbConnection> dbConns = new ArrayList<>();
		while (keys.hasMoreElements()) {
			String dbName = (String) keys.nextElement();
			String[] dbProps = props.getProperty(dbName).split(";");
			dbConns.add(new DbConnection(dbName, dbProps[0], dbProps[1], dbProps[2]));
		}
		return dbConns;
	}
}
