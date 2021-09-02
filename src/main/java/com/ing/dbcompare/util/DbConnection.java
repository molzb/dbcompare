package com.ing.dbcompare.util;

import java.sql.Connection;

public class DbConnection {
	public DbConnection(String name, String url, String user, String pw) {
		this.name = name;
		this.url = url;
		this.user = user;
		this.pw = pw;
	}

	public String name;
	String url;
	String user;
	String pw;
	Connection conn;

	@Override
	public String toString() {
		return String.format("[DBConnection Name: %s, URL: %s, User: %s, PW: %s]", name, url, user, pw);
	}

	public String toJson() {
		return String.format("{\"name\": \"%s\"}", name);
	}
}